import React, { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/integrations/supabase/client";

type ReportableType = "listing" | "store_sku" | "user" | "message";

const REASONS: { value: string; label: string }[] = [
  { value: "counterfeit", label: "Counterfeit or fake card" },
  { value: "not_as_described", label: "Not as described" },
  { value: "prohibited_item", label: "Prohibited item" },
  { value: "stolen", label: "Stolen goods" },
  { value: "spam_or_scam", label: "Spam or scam" },
  { value: "offensive", label: "Offensive or abusive content" },
  { value: "other", label: "Something else" },
];

interface ReportContentButtonProps {
  contentType: ReportableType;
  contentId: string;
  /** Render as a plain text link instead of an outline button. */
  asLink?: boolean;
}

const ReportContentButton: React.FC<ReportContentButtonProps> = ({
  contentType,
  contentId,
  asLink,
}) => {
  const { toast } = useToast();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("file_content_report", {
        _content_type: contentType,
        _content_id: contentId,
        _reason: reason,
        _details: details.trim() || null,
      });
      if (error) throw error;
      toast({
        title: "Report submitted",
        description: "Thanks — our team will review it.",
      });
      setOpen(false);
      setReason("");
      setDetails("");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't submit report",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {asLink ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Flag className="h-3 w-3" /> Report
        </button>
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Flag className="h-3.5 w-3.5" /> Report
        </Button>
      )}

      <Dialog open={open} onOpenChange={(v) => !submitting && setOpen(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report this {contentType === "store_sku" ? "listing" : contentType}</DialogTitle>
            <DialogDescription>
              Tell us what's wrong. Reports are private and reviewed by the CollectX team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Details (optional)</Label>
              <Textarea
                rows={3}
                maxLength={2000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Anything that helps us review it faster."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!reason || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportContentButton;
