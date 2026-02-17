import { useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";
import type { PersonalityTrait } from "@/hooks/useVibeDNA";

interface VibeShareCardProps {
  open: boolean;
  onClose: () => void;
  vibeBreakdown: { label: string; percentage: number; color: string }[];
  personalityTraits: PersonalityTrait[];
  userName?: string;
}

const VibeShareCard = ({ open, onClose, vibeBreakdown, personalityTraits, userName }: VibeShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!open) return null;

  const generateImage = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (err) {
      console.error("Failed to generate image:", err);
      toast({ title: "Failed to generate image", variant: "destructive" });
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    const blob = await generateImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-sweetspots-vibe.png";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Vibe Card saved! 🎉" });
  };

  const handleShare = async () => {
    const blob = await generateImage();
    if (!blob) return;

    const file = new File([blob], "my-sweetspots-vibe.png", { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: "My SweetSpots Vibe",
          text: "Check out my vibe DNA on SweetSpots 🍯",
          files: [file],
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          // Fallback to download
          handleDownload();
        }
      }
    } else {
      // Fallback to download
      handleDownload();
    }
  };

  // Map color classes to actual inline styles for export
  const colorMap: Record<string, string> = {
    "bg-gentle-sage": "hsl(145, 25%, 75%)",
    "bg-soft-coral": "hsl(15, 70%, 65%)",
    "bg-primary": "hsl(15, 60%, 58%)",
    "bg-amber-500": "hsl(38, 92%, 50%)",
    "bg-emerald-500": "hsl(160, 84%, 39%)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-elevated overflow-hidden animate-scale-in">
        {/* Close button */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="font-semibold text-foreground text-sm">Share your Vibe Card</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* The card that gets exported */}
        <div className="px-4 pb-4">
          <div
            ref={cardRef}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(145deg, hsl(25, 15%, 12%) 0%, hsl(25, 20%, 8%) 100%)",
              padding: "28px 24px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <svg width="28" height="22" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M8 8C8 8 16 8 20 16C24 24 16 32 24 32C32 32 24 16 32 8C40 0 48 16 40 24C32 32 40 40 48 40C56 40 48 24 56 16"
                  stroke="hsl(15, 60%, 58%)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              <span style={{ color: "hsl(40, 20%, 60%)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.05em" }}>
                SWEETSPOTS
              </span>
            </div>

            <h2 style={{ color: "hsl(40, 20%, 95%)", fontSize: "22px", fontWeight: 700, marginBottom: "4px", lineHeight: 1.2 }}>
              {userName ? `${userName}'s` : "My"} Vibe DNA 🍯
            </h2>
            <p style={{ color: "hsl(30, 15%, 55%)", fontSize: "12px", marginBottom: "20px" }}>
              Here's what I'm drawn to
            </p>

            {/* Vibe Bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {vibeBreakdown.map((vibe) => (
                <div key={vibe.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: "hsl(40, 20%, 90%)", fontSize: "13px", fontWeight: 500 }}>{vibe.label}</span>
                    <span style={{ color: "hsl(30, 15%, 55%)", fontSize: "13px" }}>{vibe.percentage}%</span>
                  </div>
                  <div style={{ height: "8px", borderRadius: "4px", background: "hsl(25, 10%, 18%)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${vibe.percentage}%`,
                        borderRadius: "4px",
                        background: colorMap[vibe.color] || "hsl(15, 60%, 58%)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Personality Traits */}
            {personalityTraits.length > 0 && (
              <div>
                <p style={{ color: "hsl(30, 15%, 55%)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", marginBottom: "8px", textTransform: "uppercase" }}>
                  Personality
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {personalityTraits.slice(0, 4).map((trait) => (
                    <span
                      key={trait.label}
                      style={{
                        display: "inline-block",
                        padding: "5px 12px",
                        borderRadius: "999px",
                        background: "hsl(25, 10%, 20%)",
                        color: "hsl(15, 60%, 65%)",
                        fontSize: "12px",
                        fontWeight: 500,
                      }}
                    >
                      {trait.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: "20px", paddingTop: "12px", borderTop: "1px solid hsl(25, 10%, 20%)" }}>
              <span style={{ color: "hsl(30, 15%, 40%)", fontSize: "10px" }}>
                sweetspots.app · Find your sweet spot
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 pb-4 flex gap-3">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isExporting}
            className="flex-1 h-11 rounded-xl border-border"
          >
            <Download className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            onClick={handleShare}
            disabled={isExporting}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VibeShareCard;
