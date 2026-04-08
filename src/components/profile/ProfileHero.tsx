import { User, Loader2, Camera, Pencil, Check } from "lucide-react";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileHeroProps {
  user: any;
  username: string;
  sweetSpotsId: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  defaultCover: string;
  vibeBreakdown: Array<{ label: string; percentage: number }>;
  personalityTraits: Array<{ label: string }>;
  onAvatarChange: (url: string) => void;
  onCoverEdit: () => void;
  onUsernameChange: (name: string) => void;
  onCopyId: () => void;
  isUploadingCover: boolean;
}

const ProfileHero = ({
  user, username, sweetSpotsId, avatarUrl, coverUrl, defaultCover,
  vibeBreakdown, personalityTraits, onAvatarChange, onCoverEdit, onUsernameChange, onCopyId, isUploadingCover,
}: ProfileHeroProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;

    setIsUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      onAvatarChange(publicUrl);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const saveName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && user) {
      onUsernameChange(trimmed);
      setIsEditingName(false);
      supabase.from("profiles").update({ username: trimmed }).eq("id", user.id).then();
    }
  };

  return (
    <div className="relative">
      {/* Cover Banner */}
      <div className="relative h-36 overflow-hidden">
        <img src={coverUrl || defaultCover} alt="Cover" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        {user && (
          <button
            onClick={onCoverEdit}
            disabled={isUploadingCover}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/60 hover:text-white/90 hover:bg-white/25 transition-all"
          >
            {isUploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Avatar overlapping cover */}
      <div className="flex flex-col items-center -mt-14 relative z-10 pb-4 px-4">
        <button
          onClick={() => user && fileInputRef.current?.click()}
          className="relative w-24 h-24 rounded-full bg-background flex items-center justify-center group overflow-hidden mb-3 ring-4 ring-background shadow-lg"
          disabled={!user || isUploadingAvatar}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover rounded-full" />
          ) : (
            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
          )}
          {user && (
            <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              {isUploadingAvatar ? <Loader2 className="w-5 h-5 text-background animate-spin" /> : <Camera className="w-5 h-5 text-background" />}
            </div>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

        {isEditingName ? (
          <div className="flex items-center gap-1.5 mb-0.5">
            <input
              ref={nameInputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName(editName);
                if (e.key === 'Escape') setIsEditingName(false);
              }}
              className="bg-transparent border-b border-primary text-foreground font-bold text-lg outline-none text-center max-w-[200px]"
              maxLength={24}
              autoFocus
            />
            <button onClick={() => saveName(editName)} className="p-1 text-primary">
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => { setEditName(username); setIsEditingName(true); }} className="flex items-center gap-1.5 group mb-0.5">
            <h1 className="text-lg font-bold text-foreground">{username}</h1>
            <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        )}

        {sweetSpotsId && (
          <button onClick={onCopyId} className="text-[11px] font-mono text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors">
            {sweetSpotsId} 📋
          </button>
        )}


        <p className="text-xs text-muted-foreground">
          {vibeBreakdown.length > 0
            ? `${vibeBreakdown[0]?.label} soul · ${personalityTraits[0]?.label || 'Curious explorer'}`
            : "Curious explorer"}
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
          Traveller since {user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default ProfileHero;
