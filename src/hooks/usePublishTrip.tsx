import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { TripData, TripParams } from "./useTrip";

interface UsePublishTripResult {
  isPublished: boolean;
  publishedTemplateId: string | null;
  isLoading: boolean;
  isMutating: boolean;
  publish: (args: { tripParams: TripParams; tripData: TripData; tripName?: string | null }) => Promise<boolean>;
  unpublish: () => Promise<boolean>;
}

/**
 * Tracks and mutates the published-template state for a single trip.
 * A trip is "published" when a row exists in trip_templates with source_trip_id = tripId.
 */
export const usePublishTrip = (tripId: string | null | undefined): UsePublishTripResult => {
  const { user } = useAuth();
  const [publishedTemplateId, setPublishedTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  // Fetch current published state
  useEffect(() => {
    if (!tripId) {
      setPublishedTemplateId(null);
      return;
    }
    let active = true;
    setIsLoading(true);
    supabase
      .from("trip_templates")
      .select("id")
      .eq("source_trip_id", tripId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setPublishedTemplateId(data?.id ?? null);
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tripId]);

  const publish = useCallback(async ({ tripParams, tripData, tripName }: { tripParams: TripParams; tripData: TripData; tripName?: string | null }) => {
    if (!user) {
      toast.error("Please sign in to publish");
      return false;
    }
    if (!tripId) return false;

    setIsMutating(true);
    try {
      // Pull author display info from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      // Try to derive a cover image from the first activity that has a photo
      let coverImage: string | null = null;
      try {
        const firstPhoto = (tripData?.days ?? [])
          .flatMap((d: any) => d?.slots ?? [])
          .flatMap((s: any) => s?.activities ?? [])
          .find((a: any) => a?.photoName)?.photoName;
        if (firstPhoto) {
          // Use the place-photo edge function URL pattern
          const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
          if (projectId) {
            coverImage = `https://${projectId}.supabase.co/functions/v1/place-photo?photo_name=${encodeURIComponent(firstPhoto)}&maxWidthPx=800`;
          }
        }
      } catch {
        // ignore — cover image is optional
      }

      const duration = (tripData?.days?.length ?? 0) || 1;

      const { data, error } = await supabase
        .from("trip_templates")
        .insert({
          destination: tripParams.destination,
          duration,
          vibes: tripParams.vibes ?? [],
          budget: tripParams.budget ?? "$$",
          group_size: tripParams.groupSize ?? 2,
          tagline: tripName || null,
          trip_data: tripData as any,
          cover_image: coverImage,
          is_active: true,
          published_by: user.id,
          source_trip_id: tripId,
          author_username: profile?.username ?? null,
          author_avatar_url: profile?.avatar_url ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;
      setPublishedTemplateId(data.id);
      toast.success("Published to SweetSpots");
      return true;
    } catch (e: any) {
      console.error("publish error", e);
      toast.error(e?.message || "Could not publish trip");
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [user, tripId]);

  const unpublish = useCallback(async () => {
    if (!publishedTemplateId) return false;
    setIsMutating(true);
    try {
      const { error } = await supabase
        .from("trip_templates")
        .delete()
        .eq("id", publishedTemplateId);
      if (error) throw error;
      setPublishedTemplateId(null);
      toast.success("Unpublished from SweetSpots");
      return true;
    } catch (e: any) {
      console.error("unpublish error", e);
      toast.error(e?.message || "Could not unpublish trip");
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [publishedTemplateId]);

  return {
    isPublished: !!publishedTemplateId,
    publishedTemplateId,
    isLoading,
    isMutating,
    publish,
    unpublish,
  };
};
