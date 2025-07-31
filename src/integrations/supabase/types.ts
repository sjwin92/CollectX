export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      marketplace_favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_interests: {
        Row: {
          created_at: string
          id: string
          interest_type: string
          listing_id: string
          message: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_type?: string
          listing_id: string
          message?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_type?: string
          listing_id?: string
          message?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_interests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          asking_price: number | null
          card_id: string
          card_name: string
          card_number: string | null
          condition: string
          created_at: string
          description: string | null
          expires_at: string | null
          featured: boolean | null
          grade_company: string | null
          grade_score: number | null
          id: string
          image_url: string | null
          image_url_small: string | null
          interested_count: number | null
          is_graded: boolean | null
          listing_type: string
          quantity: number
          rarity: string | null
          set_id: string
          set_name: string
          status: string
          trade_preferences: string | null
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          asking_price?: number | null
          card_id: string
          card_name: string
          card_number?: string | null
          condition?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          featured?: boolean | null
          grade_company?: string | null
          grade_score?: number | null
          id?: string
          image_url?: string | null
          image_url_small?: string | null
          interested_count?: number | null
          is_graded?: boolean | null
          listing_type?: string
          quantity?: number
          rarity?: string | null
          set_id: string
          set_name: string
          status?: string
          trade_preferences?: string | null
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          asking_price?: number | null
          card_id?: string
          card_name?: string
          card_number?: string | null
          condition?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          featured?: boolean | null
          grade_company?: string | null
          grade_score?: number | null
          id?: string
          image_url?: string | null
          image_url_small?: string | null
          interested_count?: number | null
          is_graded?: boolean | null
          listing_type?: string
          quantity?: number
          rarity?: string | null
          set_id?: string
          set_name?: string
          status?: string
          trade_preferences?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          location: string | null
          reputation_score: number
          successful_trades: number
          total_trades: number
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          reputation_score?: number
          successful_trades?: number
          total_trades?: number
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          reputation_score?: number
          successful_trades?: number
          total_trades?: number
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      trade_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string | null
          trade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string | null
          trade_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string | null
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_messages_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_ratings: {
        Row: {
          created_at: string
          id: string
          rated_user_id: string
          rater_user_id: string
          rating: number
          review: string | null
          trade_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rated_user_id: string
          rater_user_id: string
          rating: number
          review?: string | null
          trade_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rated_user_id?: string
          rater_user_id?: string
          rating?: number
          review?: string | null
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_ratings_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          escrow_amount: number | null
          escrow_paid: boolean | null
          escrow_required: boolean | null
          id: string
          initiator_cards: Json
          initiator_user_id: string
          initiator_value: number | null
          recipient_cards: Json
          recipient_user_id: string
          recipient_value: number | null
          shipping_address: string | null
          status: string
          title: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          escrow_amount?: number | null
          escrow_paid?: boolean | null
          escrow_required?: boolean | null
          id?: string
          initiator_cards?: Json
          initiator_user_id: string
          initiator_value?: number | null
          recipient_cards?: Json
          recipient_user_id: string
          recipient_value?: number | null
          shipping_address?: string | null
          status?: string
          title?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          escrow_amount?: number | null
          escrow_paid?: boolean | null
          escrow_required?: boolean | null
          id?: string
          initiator_cards?: Json
          initiator_user_id?: string
          initiator_value?: number | null
          recipient_cards?: Json
          recipient_user_id?: string
          recipient_value?: number | null
          shipping_address?: string | null
          status?: string
          title?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_cards: {
        Row: {
          card_id: string
          card_name: string
          card_number: string | null
          condition: string | null
          created_at: string
          for_trade: boolean | null
          grade_company: string | null
          grade_population: number | null
          grade_score: number | null
          id: string
          image_url: string | null
          image_url_small: string | null
          is_graded: boolean | null
          product_type: string | null
          quantity: number
          rarity: string | null
          release_date: string | null
          sealed_product_type: string | null
          set_id: string
          set_name: string
          tcg_player_url: string | null
          trade_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          card_name: string
          card_number?: string | null
          condition?: string | null
          created_at?: string
          for_trade?: boolean | null
          grade_company?: string | null
          grade_population?: number | null
          grade_score?: number | null
          id?: string
          image_url?: string | null
          image_url_small?: string | null
          is_graded?: boolean | null
          product_type?: string | null
          quantity?: number
          rarity?: string | null
          release_date?: string | null
          sealed_product_type?: string | null
          set_id: string
          set_name: string
          tcg_player_url?: string | null
          trade_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          card_name?: string
          card_number?: string | null
          condition?: string | null
          created_at?: string
          for_trade?: boolean | null
          grade_company?: string | null
          grade_population?: number | null
          grade_score?: number | null
          id?: string
          image_url?: string | null
          image_url_small?: string | null
          is_graded?: boolean | null
          product_type?: string | null
          quantity?: number
          rarity?: string | null
          release_date?: string | null
          sealed_product_type?: string | null
          set_id?: string
          set_name?: string
          tcg_player_url?: string | null
          trade_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wishlist: {
        Row: {
          card_id: string
          card_name: string
          created_at: string
          id: string
          image_url: string | null
          max_price: number | null
          priority: number | null
          set_id: string
          set_name: string
          user_id: string
        }
        Insert: {
          card_id: string
          card_name: string
          created_at?: string
          id?: string
          image_url?: string | null
          max_price?: number | null
          priority?: number | null
          set_id: string
          set_name: string
          user_id: string
        }
        Update: {
          card_id?: string
          card_name?: string
          created_at?: string
          id?: string
          image_url?: string | null
          max_price?: number | null
          priority?: number | null
          set_id?: string
          set_name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_listing_views: {
        Args: { listing_id: string }
        Returns: undefined
      }
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
