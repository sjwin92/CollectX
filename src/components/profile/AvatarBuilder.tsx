import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Shuffle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AvatarConfig,
  DEFAULT_AVATAR,
  PALETTE,
  HAIR_STYLES,
  EYE_STYLES,
  OUTFIT_STYLES,
  ACCESSORIES,
  drawAvatar,
  randomAvatarConfig,
  avatarToBlob,
} from "@/lib/pixelAvatar";

interface AvatarBuilderProps {
  open: boolean;
  onClose: () => void;
  initial?: AvatarConfig | null;
  onSaved: (publicUrl: string) => void;
}

const PREVIEW_PX = 224;

const Swatches = ({
  label,
  colors,
  value,
  onChange,
}: {
  label: string;
  colors: readonly string[];
  value: number;
  onChange: (i: number) => void;
}) => (
  <div>
    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c, i) => (
        <button
          key={i}
          type="button"
          aria-label={`${label} ${i + 1}`}
          onClick={() => onChange(i)}
          className={`h-7 w-7 rounded-md border-2 transition-transform ${value === i ? "scale-110 border-primary" : "border-border hover:scale-105"}`}
          style={{ background: c }}
        />
      ))}
    </div>
  </div>
);

const Chips = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: number;
  onChange: (i: number) => void;
}) => (
  <div>
    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {options.map((o, i) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(i)}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            value === i ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  </div>
);

const AvatarBuilder: React.FC<AvatarBuilderProps> = ({ open, onClose, initial, onSaved }) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cfg, setCfg] = useState<AvatarConfig>(initial ?? DEFAULT_AVATAR);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setCfg(initial ?? DEFAULT_AVATAR);
  }, [open, initial]);

  const paint = useCallback((el: HTMLCanvasElement | null) => {
    const ctx = el?.getContext("2d");
    if (ctx) drawAvatar(ctx, cfg, PREVIEW_PX);
  }, [cfg]);

  // Runs synchronously after the dialog's DOM is committed, and again on every
  // config change.
  useLayoutEffect(() => {
    if (open) paint(canvasRef.current);
  }, [open, paint]);

  // …and once more on the next frame, in case Radix mounts the content async.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => paint(canvasRef.current));
    return () => cancelAnimationFrame(id);
  }, [open, paint]);

  const set = (k: keyof AvatarConfig) => (i: number) => setCfg((c) => ({ ...c, [k]: i }));

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in first");

      const blob = await avatarToBlob(cfg, 256);
      const path = `${user.id}/avatar.png`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/png" });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      // cache-bust so the new render shows immediately
      const url = `${publicUrl}?v=${Date.now()}`;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url, avatar_config: cfg, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (profErr) throw profErr;

      toast({ title: "Avatar saved" });
      onSaved(url);
      onClose();
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't save avatar", description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Design your pixel avatar</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          <canvas
            ref={(el) => { canvasRef.current = el; if (el) paint(el); }}
            width={PREVIEW_PX}
            height={PREVIEW_PX}
            className="rounded-xl border border-border bg-secondary"
            style={{ imageRendering: "pixelated", width: 176, height: 176 }}
          />
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setCfg(randomAvatarConfig())}>
            <Shuffle className="mr-1.5 h-4 w-4" /> Randomise
          </Button>
        </div>

        <div className="mt-2 grid gap-4">
          <Swatches label="Background" colors={PALETTE.bg} value={cfg.bg} onChange={set("bg")} />
          <Swatches label="Skin" colors={PALETTE.skin} value={cfg.skin} onChange={set("skin")} />
          <Chips label="Hair" options={HAIR_STYLES} value={cfg.hair} onChange={set("hair")} />
          <Swatches label="Hair colour" colors={PALETTE.hair} value={cfg.hairColor} onChange={set("hairColor")} />
          <Chips label="Eyes" options={EYE_STYLES} value={cfg.eyes} onChange={set("eyes")} />
          <Swatches label="Eye colour" colors={PALETTE.eye} value={cfg.eyeColor ?? 0} onChange={set("eyeColor")} />
          <Chips label="Outfit" options={OUTFIT_STYLES} value={cfg.outfitStyle ?? 0} onChange={set("outfitStyle")} />
          <Swatches label="Outfit colour" colors={PALETTE.outfit} value={cfg.outfit} onChange={set("outfit")} />
          <Chips label="Accessory" options={ACCESSORIES} value={cfg.accessory} onChange={set("accessory")} />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…</> : "Use as profile picture"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarBuilder;
