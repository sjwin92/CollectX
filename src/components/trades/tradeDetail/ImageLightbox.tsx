import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import OptimizedImage from "@/components/ui/OptimizedImage";

export const ImageLightbox = ({
  src,
  onClose,
}: {
  src: string | null;
  onClose: () => void;
}) => {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="bg-background rounded-lg overflow-hidden max-w-3xl w-full">
        <div className="p-4 flex justify-between items-center border-b">
          <h3 className="font-medium">Image Preview</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 flex justify-center">
          <OptimizedImage src={src} alt="Expanded view" className="max-h-[70vh] object-contain" lazy={false} />
        </div>
      </div>
    </div>
  );
};
