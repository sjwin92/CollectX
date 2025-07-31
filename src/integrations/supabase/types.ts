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
      analytics_summary: {
        Row: {
          active_users: number | null
          completed_trades: number | null
          created_at: string
          id: string
          metrics: Json | null
          new_users: number | null
          summary_date: string
          summary_type: string
          total_cards_added: number | null
          total_listings: number | null
          total_searches: number | null
          total_trades: number | null
          total_users: number | null
        }
        Insert: {
          active_users?: number | null
          completed_trades?: number | null
          created_at?: string
          id?: string
          metrics?: Json | null
          new_users?: number | null
          summary_date: string
          summary_type: string
          total_cards_added?: number | null
          total_listings?: number | null
          total_searches?: number | null
          total_trades?: number | null
          total_users?: number | null
        }
        Update: {
          active_users?: number | null
          completed_trades?: number | null
          created_at?: string
          id?: string
          metrics?: Json | null
          new_users?: number | null
          summary_date?: string
          summary_type?: string
          total_cards_added?: number | null
          total_listings?: number | null
          total_searches?: number | null
          total_trades?: number | null
          total_users?: number | null
        }
        Relationships: []
      }
      card_images: {
        Row: {
          caption: string | null
          card_id: string
          created_at: string
          file_size: number | null
          id: string
          image_path: string
          image_url: string
          is_primary: boolean | null
          mime_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          card_id: string
          created_at?: string
          file_size?: number | null
          id?: string
          image_path: string
          image_url: string
          is_primary?: boolean | null
          mime_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          card_id?: string
          created_at?: string
          file_size?: number | null
          id?: string
          image_path?: string
          image_url?: string
          is_primary?: boolean | null
          mime_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1_id: string
          participant_2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1_id?: string
          participant_2_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          message_type: string | null
          metadata: Json | null
          read: boolean | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          message_type?: string | null
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string | null
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_transactions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          initiator_escrow_amount: number
          initiator_paid: boolean | null
          initiator_payment_id: string | null
          initiator_user_id: string
          metadata: Json | null
          recipient_escrow_amount: number
          recipient_paid: boolean | null
          recipient_payment_id: string | null
          recipient_user_id: string
          release_code: string | null
          status: string
          trade_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          initiator_escrow_amount?: number
          initiator_paid?: boolean | null
          initiator_payment_id?: string | null
          initiator_user_id: string
          metadata?: Json | null
          recipient_escrow_amount?: number
          recipient_paid?: boolean | null
          recipient_payment_id?: string | null
          recipient_user_id: string
          release_code?: string | null
          status?: string
          trade_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          initiator_escrow_amount?: number
          initiator_paid?: boolean | null
          initiator_payment_id?: string | null
          initiator_user_id?: string
          metadata?: Json | null
          recipient_escrow_amount?: number
          recipient_paid?: boolean | null
          recipient_payment_id?: string | null
          recipient_user_id?: string
          release_code?: string | null
          status?: string
          trade_id?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      notification_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          id: string
          listing_activities: boolean | null
          marketing: boolean | null
          push_notifications: boolean | null
          trade_proposals: boolean | null
          trade_updates: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          listing_activities?: boolean | null
          marketing?: boolean | null
          push_notifications?: boolean | null
          trade_proposals?: boolean | null
          trade_updates?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          listing_activities?: boolean | null
          marketing?: boolean | null
          push_notifications?: boolean | null
          trade_proposals?: boolean | null
          trade_updates?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pokemon_cards: {
        Row: {
          abilities: Json | null
          artist: string | null
          attacks: Json | null
          cardmarket_prices: Json | null
          converted_retreat_cost: number | null
          created_at: string | null
          evolves_from: string | null
          evolves_to: string[] | null
          flavor_text: string | null
          hp: string | null
          id: string
          images: Json | null
          large_image_url: string | null
          legalities: Json | null
          name: string
          national_pokedex_numbers: number[] | null
          number: string | null
          rarity: string | null
          regulation_mark: string | null
          resistances: Json | null
          retreat_cost: string[] | null
          rules: string[] | null
          set_id: string | null
          set_name: string | null
          small_image_url: string | null
          subtypes: string[] | null
          supertype: string | null
          tcgplayer_prices: Json | null
          types: string[] | null
          updated_at: string | null
          weaknesses: Json | null
        }
        Insert: {
          abilities?: Json | null
          artist?: string | null
          attacks?: Json | null
          cardmarket_prices?: Json | null
          converted_retreat_cost?: number | null
          created_at?: string | null
          evolves_from?: string | null
          evolves_to?: string[] | null
          flavor_text?: string | null
          hp?: string | null
          id: string
          images?: Json | null
          large_image_url?: string | null
          legalities?: Json | null
          name: string
          national_pokedex_numbers?: number[] | null
          number?: string | null
          rarity?: string | null
          regulation_mark?: string | null
          resistances?: Json | null
          retreat_cost?: string[] | null
          rules?: string[] | null
          set_id?: string | null
          set_name?: string | null
          small_image_url?: string | null
          subtypes?: string[] | null
          supertype?: string | null
          tcgplayer_prices?: Json | null
          types?: string[] | null
          updated_at?: string | null
          weaknesses?: Json | null
        }
        Update: {
          abilities?: Json | null
          artist?: string | null
          attacks?: Json | null
          cardmarket_prices?: Json | null
          converted_retreat_cost?: number | null
          created_at?: string | null
          evolves_from?: string | null
          evolves_to?: string[] | null
          flavor_text?: string | null
          hp?: string | null
          id?: string
          images?: Json | null
          large_image_url?: string | null
          legalities?: Json | null
          name?: string
          national_pokedex_numbers?: number[] | null
          number?: string | null
          rarity?: string | null
          regulation_mark?: string | null
          resistances?: Json | null
          retreat_cost?: string[] | null
          rules?: string[] | null
          set_id?: string | null
          set_name?: string | null
          small_image_url?: string | null
          subtypes?: string[] | null
          supertype?: string | null
          tcgplayer_prices?: Json | null
          types?: string[] | null
          updated_at?: string | null
          weaknesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pokemon_cards_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "pokemon_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      pokemon_sets: {
        Row: {
          created_at: string | null
          id: string
          images: Json | null
          legalities: Json | null
          logo_url: string | null
          name: string
          printed_total: number | null
          ptcgo_code: string | null
          release_date: string | null
          series: string | null
          symbol_url: string | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          images?: Json | null
          legalities?: Json | null
          logo_url?: string | null
          name: string
          printed_total?: number | null
          ptcgo_code?: string | null
          release_date?: string | null
          series?: string | null
          symbol_url?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          images?: Json | null
          legalities?: Json | null
          logo_url?: string | null
          name?: string
          printed_total?: number | null
          ptcgo_code?: string | null
          release_date?: string | null
          series?: string | null
          symbol_url?: string | null
          total?: number | null
          updated_at?: string | null
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
      search_history: {
        Row: {
          clicked_result_id: string | null
          created_at: string
          filters_applied: Json | null
          id: string
          results_count: number | null
          search_query: string
          search_type: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          clicked_result_id?: string | null
          created_at?: string
          filters_applied?: Json | null
          id?: string
          results_count?: number | null
          search_query: string
          search_type?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_result_id?: string | null
          created_at?: string
          filters_applied?: Json | null
          id?: string
          results_count?: number | null
          search_query?: string
          search_type?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      set_images: {
        Row: {
          created_at: string | null
          id: string
          image_type: string
          image_url: string
          is_working: boolean | null
          last_checked: string | null
          set_id: string | null
          source: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_type: string
          image_url: string
          is_working?: boolean | null
          last_checked?: string | null
          set_id?: string | null
          source: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_type?: string
          image_url?: string
          is_working?: boolean | null
          last_checked?: string | null
          set_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_images_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "pokemon_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_methods: {
        Row: {
          base_price: number
          carrier: string
          created_at: string
          description: string | null
          domestic_only: boolean | null
          estimated_delivery_days: number | null
          id: string
          insurance_included: boolean | null
          is_active: boolean | null
          max_dimensions_cm: string | null
          max_weight_kg: number | null
          name: string
          price_per_kg: number | null
          service_type: string
          tracking_included: boolean | null
          updated_at: string
        }
        Insert: {
          base_price: number
          carrier: string
          created_at?: string
          description?: string | null
          domestic_only?: boolean | null
          estimated_delivery_days?: number | null
          id?: string
          insurance_included?: boolean | null
          is_active?: boolean | null
          max_dimensions_cm?: string | null
          max_weight_kg?: number | null
          name: string
          price_per_kg?: number | null
          service_type: string
          tracking_included?: boolean | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          carrier?: string
          created_at?: string
          description?: string | null
          domestic_only?: boolean | null
          estimated_delivery_days?: number | null
          id?: string
          insurance_included?: boolean | null
          is_active?: boolean | null
          max_dimensions_cm?: string | null
          max_weight_kg?: number | null
          name?: string
          price_per_kg?: number | null
          service_type?: string
          tracking_included?: boolean | null
          updated_at?: string
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
          weight_from_kg: number | null
          weight_to_kg: number | null
          zone: string | null
        }
        Insert: {
          country_code: string
          created_at?: string
          id?: string
          price: number
          shipping_method_id: string
          weight_from_kg?: number | null
          weight_to_kg?: number | null
          zone?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          price?: number
          shipping_method_id?: string
          weight_from_kg?: number | null
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
          timestamp: string
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
      trade_shipments: {
        Row: {
          created_at: string
          delivered_at: string | null
          dimensions_cm: string | null
          id: string
          insurance_value: number | null
          metadata: Json | null
          recipient_address: Json
          recipient_user_id: string
          sender_address: Json
          sender_user_id: string
          shipped_at: string | null
          shipping_cost: number
          shipping_label_url: string | null
          shipping_method_id: string
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
          insurance_value?: number | null
          metadata?: Json | null
          recipient_address: Json
          recipient_user_id: string
          sender_address: Json
          sender_user_id: string
          shipped_at?: string | null
          shipping_cost: number
          shipping_label_url?: string | null
          shipping_method_id: string
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
          insurance_value?: number | null
          metadata?: Json | null
          recipient_address?: Json
          recipient_user_id?: string
          sender_address?: Json
          sender_user_id?: string
          shipped_at?: string | null
          shipping_cost?: number
          shipping_label_url?: string | null
          shipping_method_id?: string
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
      user_activity: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string
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
      user_preferences: {
        Row: {
          auto_accept_trades: boolean | null
          collection_privacy: string | null
          created_at: string
          email_frequency: string | null
          favorite_sets: string[] | null
          favorite_types: string[] | null
          id: string
          language_preference: string | null
          preferred_condition: string | null
          theme_preference: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_accept_trades?: boolean | null
          collection_privacy?: string | null
          created_at?: string
          email_frequency?: string | null
          favorite_sets?: string[] | null
          favorite_types?: string[] | null
          id?: string
          language_preference?: string | null
          preferred_condition?: string | null
          theme_preference?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_accept_trades?: boolean | null
          collection_privacy?: string | null
          created_at?: string
          email_frequency?: string | null
          favorite_sets?: string[] | null
          favorite_types?: string[] | null
          id?: string
          language_preference?: string | null
          preferred_condition?: string | null
          theme_preference?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          id: string
          report_reason: string
          reported_content_id: string | null
          reported_content_type: string | null
          reported_user_id: string | null
          reporter_user_id: string
          resolved_at: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          report_reason: string
          reported_content_id?: string | null
          reported_content_type?: string | null
          reported_user_id?: string | null
          reporter_user_id: string
          resolved_at?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          report_reason?: string
          reported_content_id?: string | null
          reported_content_type?: string | null
          reported_user_id?: string | null
          reporter_user_id?: string
          resolved_at?: string | null
          status?: string | null
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
      create_notification: {
        Args: {
          p_user_id: string
          p_type: string
          p_title: string
          p_message: string
          p_data?: Json
          p_action_url?: string
          p_expires_at?: string
        }
        Returns: string
      }
      get_or_create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_trending_cards: {
        Args: { days_back?: number }
        Returns: {
          card_name: string
          search_count: number
          view_count: number
        }[]
      }
      get_user_stats: {
        Args: { target_user_id: string }
        Returns: {
          total_cards: number
          total_trades: number
          completed_trades: number
          total_listings: number
          reputation_score: number
          join_date: string
        }[]
      }
      increment_listing_views: {
        Args: { listing_id: string }
        Returns: undefined
      }
      log_user_activity: {
        Args: {
          p_user_id: string
          p_activity_type: string
          p_activity_data?: Json
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: string
      }
      mark_notifications_read: {
        Args: { notification_ids: string[] }
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
