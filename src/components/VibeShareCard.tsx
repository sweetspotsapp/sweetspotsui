import { useRef, useState, useEffect } from "react";
import { Download, Share2, X, Copy, Check } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";
import type { PersonalityTrait } from "@/hooks/useVibeDNA";

interface CharacterMatch {
  character_name: string;
  known_for: string;
  source: string;
  match_reason: string;
  emoji: string;
  match_percentage: number;
}

interface VibeShareCardProps {
  open: boolean;
  onClose: () => void;
  vibeBreakdown: { label: string; percentage: number; color: string }[];
  personalityTraits: PersonalityTrait[];
  userName?: string;
  characterMatch?: CharacterMatch | null;
}

const VibeShareCard = ({ open, onClose, vibeBreakdown, personalityTraits, userName, characterMatch }: VibeShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Detect mobile by checking touch support + screen width
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window && window.innerWidth < 768);
    };
    checkMobile();
  }, []);
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

  const handleNativeShare = async () => {
    const blob = await generateImage();
    if (!blob) return;
    const file = new File([blob], "my-sweetspots-vibe.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: "My SweetSpots Vibe",
          text: "Check out my vibe DNA on SweetSpots 🍯\nfindyoursweetspots.com",
          files: [file],
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          handleDownload();
        }
      }
    } else {
      handleDownload();
    }
  };

  const shareText = `Check out my vibe DNA on SweetSpots 🍯`;
  const shareUrl = "https://findyoursweetspots.com";

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, "_blank");
  };

  const handleShareX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const handleCopyImage = async () => {
    const blob = await generateImage();
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      toast({ title: "Image copied to clipboard! 📋" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: download instead
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
              Here's what I vibe with
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

            {/* Character Match */}
            {characterMatch && (
              <div style={{ marginTop: "16px", padding: "12px", borderRadius: "12px", background: "hsl(25, 10%, 16%)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                  <span style={{ fontSize: "20px" }}>{characterMatch.emoji}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ color: "hsl(40, 20%, 92%)", fontSize: "13px", fontWeight: 600 }}>
                        {characterMatch.character_name}
                      </span>
                      <span style={{ color: "hsl(15, 60%, 65%)", fontSize: "10px" }}>
                        {characterMatch.match_percentage}% match
                      </span>
                    </div>
                    <p style={{ color: "hsl(15, 55%, 60%)", fontSize: "10px", fontWeight: 500, margin: 0 }}>
                      {characterMatch.known_for}
                    </p>
                  </div>
                </div>
                <p style={{ color: "hsl(30, 15%, 55%)", fontSize: "11px", margin: 0 }}>
                  {characterMatch.match_reason}
                </p>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: "20px", paddingTop: "12px", borderTop: "1px solid hsl(25, 10%, 20%)" }}>
              <span style={{ color: "hsl(30, 15%, 40%)", fontSize: "10px" }}>
                findyoursweetspots.com · Discover spots that match your vibe
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 pb-4 space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={isExporting}
              className="flex-1 h-10 rounded-xl border-border text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Save
            </Button>
            {isMobile ? (
              <Button
                onClick={handleNativeShare}
                disabled={isExporting}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5" />
                Share
              </Button>
            ) : (
              <Button
                onClick={handleCopyImage}
                disabled={isExporting}
                className="flex-1 h-10 rounded-xl border-border text-xs"
                variant="outline"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                {copied ? "Copied!" : "Copy image"}
              </Button>
            )}
          </div>

          {/* Desktop: social share buttons */}
          {!isMobile && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleShareWhatsApp}
                className="flex-1 h-10 rounded-xl border-border text-xs"
              >
                <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={handleShareX}
                className="flex-1 h-10 rounded-xl border-border text-xs"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Post on X
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VibeShareCard;
