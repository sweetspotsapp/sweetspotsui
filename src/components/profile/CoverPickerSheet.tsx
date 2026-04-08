import { Upload, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";
import { toast } from "@/hooks/use-toast";

interface PresetCover {
  src: string;
  label: string;
}

interface CoverPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetCovers: PresetCover[];
  userId: string | undefined;
  onCoverChange: (url: string) => void;
  isUploading: boolean;
  onUploadStart: () => void;
  onUploadEnd: () => void;
}

const CoverPickerSheet = ({ open, onOpenChange, presetCovers, userId, onCoverChange, isUploading, onUploadStart, onUploadEnd }: CoverPickerSheetProps) => {
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;

    onUploadStart();
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/cover.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await (supabase.from("profiles") as any).update({ cover_url: publicUrl }).eq("id", userId);
      onCoverChange(publicUrl);
      toast({ title: "Cover photo updated!" });
    } catch (err) {
      console.error("Cover upload failed:", err);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      onUploadEnd();
    }
  };

  return (
    <>
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh]">
          <SheetHeader>
            <SheetTitle>Choose cover photo</SheetTitle>
          </SheetHeader>
          <div className="mt-4 overflow-y-auto max-h-[calc(60vh-80px)] pb-20">
            <div className="grid grid-cols-3 gap-2">
              {presetCovers.map((cover) => (
                <button
                  key={cover.label}
                  onClick={async () => {
                    onCoverChange(cover.src);
                    onOpenChange(false);
                    if (userId) {
                      await (supabase.from("profiles") as any).update({ cover_url: cover.label }).eq("id", userId);
                    }
                    toast({ title: "Cover updated!" });
                  }}
                  className="relative rounded-lg overflow-hidden aspect-[3/2] group border border-border hover:border-primary/50 transition-all"
                >
                  <img src={cover.src} alt={cover.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-1 left-1.5 text-[10px] font-medium text-white/90">{cover.label}</span>
                </button>
              ))}
              <button
                onClick={() => { onOpenChange(false); setTimeout(() => coverInputRef.current?.click(), 200); }}
                className="relative rounded-lg overflow-hidden aspect-[3/2] border-2 border-dashed border-border hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <Upload className="w-4 h-4" />
                <span className="text-[10px] font-medium">Upload yours</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CoverPickerSheet;
