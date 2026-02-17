import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface UseSavedPlacesReturn {
  savedPlaceIds: Set<string>;
  isLoading: boolean;
  toggleSave: (placeId: string) => Promise<void>;
  isSaved: (placeId: string) => boolean;
  logInteraction: (placeId: string, action: string, weight: number) => Promise<void>;
  removePlaceIds: (placeIds: string[]) => void;
}

export const useSavedPlaces = (): UseSavedPlacesReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Load saved places on mount/user change
  useEffect(() => {
    if (!user) {
      setSavedPlaceIds(new Set());
      return;
    }

    const loadSavedPlaces = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('saved_places')
          .select('place_id')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error loading saved places:', error);
          return;
        }

        setSavedPlaceIds(new Set(data.map(p => p.place_id)));
      } catch (err) {
        console.error('Failed to load saved places:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedPlaces();
  }, [user]);

  const logInteraction = useCallback(async (
    placeId: string,
    action: string,
    weight: number
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('place_interactions')
        .insert({
          user_id: user.id,
          place_id: placeId,
          action,
          weight,
        });

      if (error) {
        console.error('Error logging interaction:', error);
      }
    } catch (err) {
      console.error('Failed to log interaction:', err);
    }
  }, [user]);

  const toggleSave = useCallback(async (placeId: string) => {
    if (!user) {
      // Auth dialog is now handled by AppContext
      return;
    }

    const wasSaved = savedPlaceIds.has(placeId);

    // Optimistic update
    setSavedPlaceIds(prev => {
      const next = new Set(prev);
      if (wasSaved) {
        next.delete(placeId);
      } else {
        next.add(placeId);
      }
      return next;
    });

    try {
      if (wasSaved) {
        // Unsave: delete from saved_places
        const { error } = await supabase
          .from('saved_places')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', placeId);

        if (error) throw error;

        // Also remove from all boards
        const { error: boardError } = await supabase
          .from('board_places')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', placeId);

        if (boardError) {
          console.error('Error removing from boards:', boardError);
        }

        // Log unsave interaction
        await logInteraction(placeId, 'unsave', -2);

        // Show success toast for unsave
        toast({
          title: 'Removed from saved',
          description: 'Place has been removed from your saved list',
        });
      } else {
        // Save: insert into saved_places
        const { error } = await supabase
          .from('saved_places')
          .insert({
            user_id: user.id,
            place_id: placeId,
          });

        // Ignore duplicate error - place is already saved
        if (error && error.code !== '23505') throw error;

        // Log save interaction
        await logInteraction(placeId, 'save', 3);
      }
    } catch (err) {
      console.error('Error toggling save:', err);
      
      // Rollback optimistic update
      setSavedPlaceIds(prev => {
        const next = new Set(prev);
        if (wasSaved) {
          next.add(placeId);
        } else {
          next.delete(placeId);
        }
        return next;
      });

      toast({
        title: 'Error',
        description: wasSaved ? 'Failed to unsave place' : 'Failed to save place',
        variant: 'destructive',
      });
    }
  }, [user, savedPlaceIds, logInteraction, toast]);

  const isSaved = useCallback((placeId: string) => savedPlaceIds.has(placeId), [savedPlaceIds]);

  const removePlaceIds = useCallback((placeIds: string[]) => {
    if (placeIds.length === 0) return;
    setSavedPlaceIds(prev => {
      const next = new Set(prev);
      placeIds.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  return {
    savedPlaceIds,
    isLoading,
    toggleSave,
    isSaved,
    logInteraction,
    removePlaceIds,
  };
};
