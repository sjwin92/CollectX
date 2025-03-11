export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      pokemon_cards_cache: {
        Row: {
          cached_at: string
          data: Json
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          cached_at?: string
          data: Json
          id: string
          image_url?: string | null
          name: string
        }
        Update: {
          cached_at?: string
          data?: Json
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      trade_cards: {
        Row: {
          card_id: string
          condition: string
          currency: string
          estimated_value: number | null
          id: string
          trade_id: string
          user_id: string
        }
        Insert: {
          card_id: string
          condition: string
          currency?: string
          estimated_value?: number | null
          id?: string
          trade_id: string
          user_id: string
        }
        Update: {
          card_id?: string
          condition?: string
          currency?: string
          estimated_value?: number | null
          id?: string
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "pokemon_cards_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_cards_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trade_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          system_message: boolean
          trade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          system_message?: boolean
          trade_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          system_message?: boolean
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_messages_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trade_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_proposals: {
        Row: {
          created_at: string
          id: string
          initiator_id: string
          recipient_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiator_id: string
          recipient_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          initiator_id?: string
          recipient_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_collections: {
        Row: {
          acquired_at: string
          card_id: string
          condition: string
          for_trade: boolean
          grading_company: string | null
          grading_value: string | null
          id: string
          last_modified: string | null
          notes: string | null
          purchase_currency: string | null
          purchase_price: number | null
          quantity: number
          user_id: string
        }
        Insert: {
          acquired_at?: string
          card_id: string
          condition?: string
          for_trade?: boolean
          grading_company?: string | null
          grading_value?: string | null
          id?: string
          last_modified?: string | null
          notes?: string | null
          purchase_currency?: string | null
          purchase_price?: number | null
          quantity?: number
          user_id: string
        }
        Update: {
          acquired_at?: string
          card_id?: string
          condition?: string
          for_trade?: boolean
          grading_company?: string | null
          grading_value?: string | null
          id?: string
          last_modified?: string | null
          notes?: string | null
          purchase_currency?: string | null
          purchase_price?: number | null
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_collections_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "pokemon_cards_cache"
            referencedColumns: ["id"]
          },
        ]
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
