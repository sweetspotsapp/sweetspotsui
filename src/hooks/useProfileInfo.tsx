import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ProfileInfo {
  avatarUrl: string | null;
  username: string;
  coverUrl: string | null;
  sweetSpotsId: string | null;
  loading: boolean;
  refresh: () => void;
}

export const useProfileInfo = (): ProfileInfo => {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("Explorer");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [sweetSpotsId, setSweetSpotsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, username, cover_url, sweetspots_id")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setAvatarUrl(data.avatar_url || null);
      if (data.username && data.username !== "Explorer") setUsername(data.username);
      setCoverUrl(data.cover_url || null);
      setSweetSpotsId(data.sweetspots_id || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchProfile();
  }, [user?.id]);

  return { avatarUrl, username, coverUrl, sweetSpotsId, loading, refresh: fetchProfile };
};
