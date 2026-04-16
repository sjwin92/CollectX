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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      card_images: {
        Row: {
          caption: string | null
          card_id: string | null
          created_at: string
          file_size: number | null
          id: string
          image_path: string
          image_url: string
          is_primary: boolean
          mime_type: string | null
          user_card_id: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          card_id?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          image_path: string
          image_url: string
          is_primary?: boolean
          mime_type?: string | null
          user_card_id?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          card_id?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          image_path?: string
          image_url?: string
          is_primary?: boolean
          mime_type?: string | null
          user_card_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_images_user_card_id_fkey"
            columns: ["user_card_id"]
            isOneToOne: false
            referencedRelation: "user_cards"
            referencedColumns: ["id"]
          },
        ]
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
      shipping_methods: {
        Row: {
          base_price: number
          carrier: string
          created_at: string
          description: string | null
          domestic_only: boolean
          estimated_delivery_days: number | null
          id: string
          insurance_included: boolean
          is_active: boolean
          max_dimensions_cm: string | null
          max_weight_kg: number | null
          name: string
          price_per_kg: number
          service_type: string
          tracking_included: boolean
        }
        Insert: {
          base_price?: number
          carrier: string
          created_at?: string
          description?: string | null
          domestic_only?: boolean
          estimated_delivery_days?: number | null
          id?: string
          insurance_included?: boolean
          is_active?: boolean
          max_dimensions_cm?: string | null
          max_weight_kg?: number | null
          name: string
          price_per_kg?: number
          service_type: string
          tracking_included?: boolean
        }
        Update: {
          base_price?: number
          carrier?: string
          created_at?: string
          description?: string | null
          domestic_only?: boolean
          estimated_delivery_days?: number | null
          id?: string
          insurance_included?: boolean
          is_active?: boolean
          max_dimensions_cm?: string | null
          max_weight_kg?: number | null
          name?: string
          price_per_kg?: number
          service_type?: string
          tracking_included?: boolean
        }
        Relationships: []
      }
      shipping_rates: {
        Row: {
          country_code: string
          created_at: string
          id: string
          price: number
          shipping_method_id: string
          weight_from_kg: number
          weight_to_kg: number | null
          zone: string | null
        }
        Insert: {
          country_code: string
          created_at?: string
          id?: string
          price: number
          shipping_method_id: string
          weight_from_kg?: number
          weight_to_kg?: number | null
          zone?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          price?: number
          shipping_method_id?: string
          weight_from_kg?: number
          weight_to_kg?: number | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_shipping_method_id_fkey"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          carrier_event_id: string | null
          created_at: string
          event_description: string
          event_type: string
          id: string
          location: string | null
          shipment_id: string
          timestamp: string
        }
        Insert: {
          carrier_event_id?: string | null
          created_at?: string
          event_description: string
          event_type: string
          id?: string
          location?: string | null
          shipment_id: string
          timestamp?: string
        }
        Update: {
          carrier_event_id?: string | null
          created_at?: string
          event_description?: string
          event_type?: string
          id?: string
          location?: string | null
          shipment_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "trade_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string
          metadata: Json | null
          sender_user_id: string
          trade_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string
          metadata?: Json | null
          sender_user_id: string
          trade_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          metadata?: Json | null
          sender_user_id?: string
          trade_id?: string
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
      trade_shipments: {
        Row: {
          created_at: string
          delivered_at: string | null
          dimensions_cm: string | null
          id: string
          insurance_value: number
          metadata: Json | null
          recipient_address: Json | null
          recipient_user_id: string
          sender_address: Json | null
          sender_user_id: string
          shipped_at: string | null
          shipping_cost: number
          shipping_label_url: string | null
          shipping_method_id: string | null
          status: string
          tracking_number: string | null
          trade_id: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          dimensions_cm?: string | null
          id?: string
          insurance_value?: number
          metadata?: Json | null
          recipient_address?: Json | null
          recipient_user_id: string
          sender_address?: Json | null
          sender_user_id: string
          shipped_at?: string | null
          shipping_cost?: number
          shipping_label_url?: string | null
          shipping_method_id?: string | null
          status?: string
          tracking_number?: string | null
          trade_id: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          dimensions_cm?: string | null
          id?: string
          insurance_value?: number
          metadata?: Json | null
          recipient_address?: Json | null
          recipient_user_id?: string
          sender_address?: Json | null
          sender_user_id?: string
          shipped_at?: string | null
          shipping_cost?: number
          shipping_label_url?: string | null
          shipping_method_id?: string | null
          status?: string
          tracking_number?: string | null
          trade_id?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_shipments_shipping_method_id_fkey"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_shipments_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          created_at: string
          description: string | null
          escrow_required: boolean
          id: string
          initiator_cards: Json
          initiator_user_id: string
          initiator_value: number
          metadata: Json | null
          recipient_cards: Json
          recipient_user_id: string
          recipient_value: number
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          escrow_required?: boolean
          id?: string
          initiator_cards?: Json
          initiator_user_id: string
          initiator_value?: number
          metadata?: Json | null
          recipient_cards?: Json
          recipient_user_id: string
          recipient_value?: number
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          escrow_required?: boolean
          id?: string
          initiator_cards?: Json
          initiator_user_id?: string
          initiator_value?: number
          metadata?: Json | null
          recipient_cards?: Json
          recipient_user_id?: string
          recipient_value?: number
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_cards: {
        Row: {
          card_id: string
          card_image: string | null
          card_name: string | null
          card_number: string | null
          condition: string | null
          created_at: string
          for_sale: boolean
          for_trade: boolean
          grade_score: string | null
          grading_company: string | null
          id: string
          is_graded: boolean
          metadata: Json | null
          notes: string | null
          product_type: string
          quantity: number
          rarity: string | null
          sale_price: number | null
          set_id: string | null
          set_name: string | null
          trade_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          card_image?: string | null
          card_name?: string | null
          card_number?: string | null
          condition?: string | null
          created_at?: string
          for_sale?: boolean
          for_trade?: boolean
          grade_score?: string | null
          grading_company?: string | null
          id?: string
          is_graded?: boolean
          metadata?: Json | null
          notes?: string | null
          product_type?: string
          quantity?: number
          rarity?: string | null
          sale_price?: number | null
          set_id?: string | null
          set_name?: string | null
          trade_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          card_image?: string | null
          card_name?: string | null
          card_number?: string | null
          condition?: string | null
          created_at?: string
          for_sale?: boolean
          for_trade?: boolean
          grade_score?: string | null
          grading_company?: string | null
          id?: string
          is_graded?: boolean
          metadata?: Json | null
          notes?: string | null
          product_type?: string
          quantity?: number
          rarity?: string | null
          sale_price?: number | null
          set_id?: string | null
          set_name?: string | null
          trade_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
