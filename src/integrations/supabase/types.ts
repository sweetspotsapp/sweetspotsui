export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      board_places: {
        Row: {
          added_at: string
          board_id: string
          id: string
          place_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          board_id: string
          id?: string
          place_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          board_id?: string
          id?: string
          place_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_places_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      itineraries: {
        Row: {
          accommodation: Json | null
          board_ids: string[] | null
          budget: string
          created_at: string
          destination: string
          end_date: string
          flight_details: Json | null
          group_size: number
          id: string
          itinerary_data: Json | null
          must_include_place_ids: string[] | null
          name: string | null
          start_date: string
          updated_at: string
          user_id: string
          vibes: string[] | null
        }
        Insert: {
          accommodation?: Json | null
          board_ids?: string[] | null
          budget?: string
          created_at?: string
          destination: string
          end_date: string
          flight_details?: Json | null
          group_size?: number
          id?: string
          itinerary_data?: Json | null
          must_include_place_ids?: string[] | null
          name?: string | null
          start_date: string
          updated_at?: string
          user_id: string
          vibes?: string[] | null
        }
        Update: {
          accommodation?: Json | null
          board_ids?: string[] | null
          budget?: string
          created_at?: string
          destination?: string
          end_date?: string
          flight_details?: Json | null
          group_size?: number
          id?: string
          itinerary_data?: Json | null
          must_include_place_ids?: string[] | null
          name?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
          vibes?: string[] | null
        }
        Relationships: []
      }
      place_interactions: {
        Row: {
          action: string
          created_at: string
          id: string
          place_id: string
          user_id: string
          weight: number | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          place_id: string
          user_id: string
          weight?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          place_id?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "place_interactions_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      places: {
        Row: {
          address: string | null
          ai_reason: string | null
          best_for: string[] | null
          categories: string[] | null
          filter_tags: string[] | null
          insider_tips: string[] | null
          is_open_now: boolean | null
          last_enriched_at: string | null
          lat: number | null
          lng: number | null
          local_secrets: string | null
          name: string
          opening_hours: Json | null
          photo_name: string | null
          photos: string[] | null
          place_id: string
          price_level: number | null
          provider: string | null
          rating: number | null
          ratings_total: number | null
          raw: Json | null
          reviews: Json | null
          signature_items: string[] | null
          unique_vibes: string | null
        }
        Insert: {
          address?: string | null
          ai_reason?: string | null
          best_for?: string[] | null
          categories?: string[] | null
          filter_tags?: string[] | null
          insider_tips?: string[] | null
          is_open_now?: boolean | null
          last_enriched_at?: string | null
          lat?: number | null
          lng?: number | null
          local_secrets?: string | null
          name: string
          opening_hours?: Json | null
          photo_name?: string | null
          photos?: string[] | null
          place_id: string
          price_level?: number | null
          provider?: string | null
          rating?: number | null
          ratings_total?: number | null
          raw?: Json | null
          reviews?: Json | null
          signature_items?: string[] | null
          unique_vibes?: string | null
        }
        Update: {
          address?: string | null
          ai_reason?: string | null
          best_for?: string[] | null
          categories?: string[] | null
          filter_tags?: string[] | null
          insider_tips?: string[] | null
          is_open_now?: boolean | null
          last_enriched_at?: string | null
          lat?: number | null
          lng?: number | null
          local_secrets?: string | null
          name?: string
          opening_hours?: Json | null
          photo_name?: string | null
          photos?: string[] | null
          place_id?: string
          price_level?: number | null
          provider?: string | null
          rating?: number | null
          ratings_total?: number | null
          raw?: Json | null
          reviews?: Json | null
          signature_items?: string[] | null
          unique_vibes?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          budget: string | null
          created_at: string
          dietary: Json | null
          id: string
          mobility: Json | null
          notification_settings: Json | null
          privacy_settings: Json | null
          username: string | null
          vibe: Json | null
        }
        Insert: {
          avatar_url?: string | null
          budget?: string | null
          created_at?: string
          dietary?: Json | null
          id: string
          mobility?: Json | null
          notification_settings?: Json | null
          privacy_settings?: Json | null
          username?: string | null
          vibe?: Json | null
        }
        Update: {
          avatar_url?: string | null
          budget?: string | null
          created_at?: string
          dietary?: Json | null
          id?: string
          mobility?: Json | null
          notification_settings?: Json | null
          privacy_settings?: Json | null
          username?: string | null
          vibe?: Json | null
        }
        Relationships: []
      }
      query_cache: {
        Row: {
          cache_key: string
          cache_value: Json
          created_at: string
          expires_at: string
        }
        Insert: {
          cache_key: string
          cache_value: Json
          created_at?: string
          expires_at: string
        }
        Update: {
          cache_key?: string
          cache_value?: Json
          created_at?: string
          expires_at?: string
        }
        Relationships: []
      }
      saved_places: {
        Row: {
          created_at: string
          id: string
          place_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          place_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          place_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["place_id"]
          },
        ]
      }
      search_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          search_prompt: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          search_prompt?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          search_prompt?: string | null
          user_id?: string
        }
        Relationships: []
      }
      searches: {
        Row: {
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          mode: string | null
          prompt: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          mode?: string | null
          prompt: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          mode?: string | null
          prompt?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_expired_cache: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
