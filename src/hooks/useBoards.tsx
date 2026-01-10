import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { ToastAction } from '@/components/ui/toast';

export interface Board {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
  placeIds: string[];
}

interface UseBoardsReturn {
  boards: Board[];
  isLoading: boolean;
  createBoard: (name: string, color: string, placeIds?: string[]) => Promise<Board | null>;
  updateBoard: (id: string, name: string, color: string) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  addPlaceToBoard: (boardId: string, placeId: string) => Promise<void>;
  removePlaceFromBoard: (boardId: string, placeId: string) => Promise<void>;
  getBoardPlaceIds: (boardId: string) => string[];
  refetch: () => Promise<void>;
}

export const useBoards = (): UseBoardsReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load boards with their place IDs
  const loadBoards = useCallback(async () => {
    if (!user) {
      setBoards([]);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch boards
      const { data: boardsData, error: boardsError } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (boardsError) {
        console.error('Error loading boards:', boardsError);
        return;
      }

      // Fetch all board_places for this user
      const { data: boardPlacesData, error: placesError } = await supabase
        .from('board_places')
        .select('board_id, place_id')
        .eq('user_id', user.id);

      if (placesError) {
        console.error('Error loading board places:', placesError);
        return;
      }

      // Group place IDs by board
      const placesByBoard: Record<string, string[]> = {};
      boardPlacesData?.forEach(bp => {
        if (!placesByBoard[bp.board_id]) {
          placesByBoard[bp.board_id] = [];
        }
        placesByBoard[bp.board_id].push(bp.place_id);
      });

      // Combine boards with their place IDs
      const boardsWithPlaces: Board[] = (boardsData || []).map(board => ({
        id: board.id,
        name: board.name,
        color: board.color,
        created_at: board.created_at,
        updated_at: board.updated_at,
        placeIds: placesByBoard[board.id] || [],
      }));

      setBoards(boardsWithPlaces);
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const createBoard = useCallback(async (
    name: string,
    color: string,
    placeIds: string[] = []
  ): Promise<Board | null> => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to create boards',
        variant: 'destructive',
        action: (
          <ToastAction altText="Log in" onClick={() => navigate('/auth')}>
            Log in
          </ToastAction>
        ),
      });
      return null;
    }

    try {
      // Create the board
      const { data: boardData, error: boardError } = await supabase
        .from('boards')
        .insert({
          user_id: user.id,
          name,
          color,
        })
        .select()
        .single();

      if (boardError) throw boardError;

      // Add places to the board if any
      if (placeIds.length > 0) {
        const boardPlaces = placeIds.map(placeId => ({
          board_id: boardData.id,
          place_id: placeId,
          user_id: user.id,
        }));

        const { error: placesError } = await supabase
          .from('board_places')
          .insert(boardPlaces);

        if (placesError) {
          console.error('Error adding places to board:', placesError);
        }
      }

      const newBoard: Board = {
        id: boardData.id,
        name: boardData.name,
        color: boardData.color,
        created_at: boardData.created_at,
        updated_at: boardData.updated_at,
        placeIds,
      };

      setBoards(prev => [newBoard, ...prev]);
      
      toast({
        title: 'Board created',
        description: `"${name}" board created successfully`,
      });

      return newBoard;
    } catch (err) {
      console.error('Error creating board:', err);
      toast({
        title: 'Error',
        description: 'Failed to create board',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  const updateBoard = useCallback(async (
    id: string,
    name: string,
    color: string
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('boards')
        .update({ name, color })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setBoards(prev => prev.map(b => 
        b.id === id ? { ...b, name, color, updated_at: new Date().toISOString() } : b
      ));
    } catch (err) {
      console.error('Error updating board:', err);
      toast({
        title: 'Error',
        description: 'Failed to update board',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  const deleteBoard = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setBoards(prev => prev.filter(b => b.id !== id));
      
      toast({
        title: 'Board deleted',
        description: 'Board has been removed',
      });
    } catch (err) {
      console.error('Error deleting board:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete board',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  const addPlaceToBoard = useCallback(async (boardId: string, placeId: string) => {
    if (!user) return;

    try {
      // Also save to saved_places so it appears in "All Saved"
      const { error: savedError } = await supabase
        .from('saved_places')
        .insert({
          user_id: user.id,
          place_id: placeId,
        });

      // Ignore duplicate error for saved_places
      if (savedError && savedError.code !== '23505') {
        console.error('Error saving place:', savedError);
      }

      const { error } = await supabase
        .from('board_places')
        .insert({
          board_id: boardId,
          place_id: placeId,
          user_id: user.id,
        });

      if (error) {
        // Handle duplicate error gracefully
        if (error.code === '23505') {
          return; // Already exists
        }
        throw error;
      }

      setBoards(prev => prev.map(b => 
        b.id === boardId 
          ? { ...b, placeIds: [...b.placeIds, placeId] }
          : b
      ));
    } catch (err) {
      console.error('Error adding place to board:', err);
      throw err;
    }
  }, [user]);

  const removePlaceFromBoard = useCallback(async (boardId: string, placeId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('board_places')
        .delete()
        .eq('board_id', boardId)
        .eq('place_id', placeId)
        .eq('user_id', user.id);

      if (error) throw error;

      setBoards(prev => prev.map(b => 
        b.id === boardId 
          ? { ...b, placeIds: b.placeIds.filter(id => id !== placeId) }
          : b
      ));
    } catch (err) {
      console.error('Error removing place from board:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove place from board',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  const getBoardPlaceIds = useCallback((boardId: string): string[] => {
    const board = boards.find(b => b.id === boardId);
    return board?.placeIds || [];
  }, [boards]);

  return {
    boards,
    isLoading,
    createBoard,
    updateBoard,
    deleteBoard,
    addPlaceToBoard,
    removePlaceFromBoard,
    getBoardPlaceIds,
    refetch: loadBoards,
  };
};
