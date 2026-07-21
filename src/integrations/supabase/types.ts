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
      catalogue_sync_runs: {
        Row: {
          card_count: number
          completed_at: string | null
          details: Json
          id: string
          language_code: string
          set_count: number
          source: string
          source_revision: string
          started_at: string
          status: string
        }
        Insert: {
          card_count?: number
          completed_at?: string | null
          details?: Json
          id?: string
          language_code?: string
          set_count?: number
          source: string
          source_revision: string
          started_at?: string
          status: string
        }
        Update: {
          card_count?: number
          completed_at?: string | null
          details?: Json
          id?: string
          language_code?: string
          set_count?: number
          source?: string
          source_revision?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          message_type: string
          metadata: Json | null
          read: boolean
          sender_user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          message_type?: string
          metadata?: Json | null
          read?: boolean
          sender_user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          metadata?: Json | null
          read?: boolean
          sender_user_id?: string
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
          featured: boolean
          grade_company: string | null
          grade_score: number | null
          id: string
          image_url: string | null
          image_url_small: string | null
          interested_count: number
          is_graded: boolean
          listing_type: string
          quantity: number
          rarity: string | null
          set_id: string | null
          set_name: string | null
          status: string
          trade_preferences: string | null
          updated_at: string
          user_card_id: string
          user_id: string
          views_count: number
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
          featured?: boolean
          grade_company?: string | null
          grade_score?: number | null
          id?: string
          image_url?: string | null
          image_url_small?: string | null
          interested_count?: number
          is_graded?: boolean
          listing_type?: string
          quantity?: number
          rarity?: string | null
          set_id?: string | null
          set_name?: string | null
          status?: string
          trade_preferences?: string | null
          updated_at?: string
          user_card_id: string
          user_id: string
          views_count?: number
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
          featured?: boolean
          grade_company?: string | null
          grade_score?: number | null
          id?: string
          image_url?: string | null
          image_url_small?: string | null
          interested_count?: number
          is_graded?: boolean
          listing_type?: string
          quantity?: number
          rarity?: string | null
          set_id?: string | null
          set_name?: string | null
          status?: string
          trade_preferences?: string | null
          updated_at?: string
          user_card_id?: string
          user_id?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_user_card_id_fkey"
            columns: ["user_card_id"]
            isOneToOne: false
            referencedRelation: "user_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      nav_metrics: {
        Row: {
          app_version: string | null
          browser: string | null
          connection_type: string | null
          created_at: string
          device_type: string | null
          downlink_mbps: number | null
          duration_ms: number
          from_route: string | null
          id: string
          is_authenticated: boolean | null
          nav_type: string | null
          os_name: string | null
          os_version: string | null
          prefetched: boolean
          referrer_host: string | null
          region: string | null
          route: string
          save_data: boolean | null
          screen_size: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
          web_vitals_cls: number | null
          web_vitals_inp_ms: number | null
          web_vitals_lcp_ms: number | null
        }
        Insert: {
          app_version?: string | null
          browser?: string | null
          connection_type?: string | null
          created_at?: string
          device_type?: string | null
          downlink_mbps?: number | null
          duration_ms: number
          from_route?: string | null
          id?: string
          is_authenticated?: boolean | null
          nav_type?: string | null
          os_name?: string | null
          os_version?: string | null
          prefetched: boolean
          referrer_host?: string | null
          region?: string | null
          route: string
          save_data?: boolean | null
          screen_size?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
          web_vitals_cls?: number | null
          web_vitals_inp_ms?: number | null
          web_vitals_lcp_ms?: number | null
        }
        Update: {
          app_version?: string | null
          browser?: string | null
          connection_type?: string | null
          created_at?: string
          device_type?: string | null
          downlink_mbps?: number | null
          duration_ms?: number
          from_route?: string | null
          id?: string
          is_authenticated?: boolean | null
          nav_type?: string | null
          os_name?: string | null
          os_version?: string | null
          prefetched?: boolean
          referrer_host?: string | null
          region?: string | null
          route?: string
          save_data?: boolean | null
          screen_size?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
          web_vitals_cls?: number | null
          web_vitals_inp_ms?: number | null
          web_vitals_lcp_ms?: number | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          marketplace_interest: boolean
          messages: boolean
          push_notifications: boolean
          trade_proposals: boolean
          trade_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          marketplace_interest?: boolean
          messages?: boolean
          push_notifications?: boolean
          trade_proposals?: boolean
          trade_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          marketplace_interest?: boolean
          messages?: boolean
          push_notifications?: boolean
          trade_proposals?: boolean
          trade_updates?: boolean
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
          read: boolean
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
          read?: boolean
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
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pokemon_cards: {
        Row: {
          artist: string | null
          created_at: string
          flavor_text: string | null
          hp: string | null
          id: string
          images: Json | null
          large_image_url: string | null
          name: string
          number: string | null
          rarity: string | null
          set_id: string | null
          set_name: string | null
          small_image_url: string | null
          subtypes: string[] | null
          supertype: string | null
          tcgplayer_prices: Json | null
          types: string[] | null
          updated_at: string
        }
        Insert: {
          artist?: string | null
          created_at?: string
          flavor_text?: string | null
          hp?: string | null
          id: string
          images?: Json | null
          large_image_url?: string | null
          name: string
          number?: string | null
          rarity?: string | null
          set_id?: string | null
          set_name?: string | null
          small_image_url?: string | null
          subtypes?: string[] | null
          supertype?: string | null
          tcgplayer_prices?: Json | null
          types?: string[] | null
          updated_at?: string
        }
        Update: {
          artist?: string | null
          created_at?: string
          flavor_text?: string | null
          hp?: string | null
          id?: string
          images?: Json | null
          large_image_url?: string | null
          name?: string
          number?: string | null
          rarity?: string | null
          set_id?: string | null
          set_name?: string | null
          small_image_url?: string | null
          subtypes?: string[] | null
          supertype?: string | null
          tcgplayer_prices?: Json | null
          types?: string[] | null
          updated_at?: string
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
          created_at: string
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
          updated_at: string
        }
        Insert: {
          created_at?: string
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
          updated_at?: string
        }
        Update: {
          created_at?: string
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
          updated_at?: string
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
      set_images: {
        Row: {
          created_at: string
          id: string
          image_type: string
          image_url: string
          is_working: boolean
          last_checked: string
          set_id: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_type: string
          image_url: string
          is_working?: boolean
          last_checked?: string
          set_id?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_type?: string
          image_url?: string
          is_working?: boolean
          last_checked?: string
          set_id?: string | null
          source?: string | null
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
      set_imports: {
        Row: {
          card_count: number
          last_error: string | null
          last_imported_at: string
          set_id: string
        }
        Insert: {
          card_count?: number
          last_error?: string | null
          last_imported_at?: string
          set_id: string
        }
        Update: {
          card_count?: number
          last_error?: string | null
          last_imported_at?: string
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_imports_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: true
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
      trade_addresses: {
        Row: {
          address: Json
          created_at: string
          id: string
          trade_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: Json
          created_at?: string
          id?: string
          trade_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: Json
          created_at?: string
          id?: string
          trade_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_addresses_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_messages: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          message: string
          message_type: string
          metadata: Json | null
          sender_user_id: string
          trade_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          message: string
          message_type?: string
          metadata?: Json | null
          sender_user_id: string
          trade_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
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
      trade_ownership_transfers: {
        Row: {
          from_user_id: string
          id: string
          to_user_id: string
          trade_id: string
          transferred_at: string
          user_card_id: string
        }
        Insert: {
          from_user_id: string
          id?: string
          to_user_id: string
          trade_id: string
          transferred_at?: string
          user_card_id: string
        }
        Update: {
          from_user_id?: string
          id?: string
          to_user_id?: string
          trade_id?: string
          transferred_at?: string
          user_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_ownership_transfers_trade_id_fkey"
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
          accepted_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          initiator_cards: Json
          initiator_confirmed_at: string | null
          initiator_user_id: string
          metadata: Json | null
          recipient_cards: Json
          recipient_confirmed_at: string | null
          recipient_user_id: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          initiator_cards?: Json
          initiator_confirmed_at?: string | null
          initiator_user_id: string
          metadata?: Json | null
          recipient_cards?: Json
          recipient_confirmed_at?: string | null
          recipient_user_id: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          initiator_cards?: Json
          initiator_confirmed_at?: string | null
          initiator_user_id?: string
          metadata?: Json | null
          recipient_cards?: Json
          recipient_confirmed_at?: string | null
          recipient_user_id?: string
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_trade: {
        Args: { _trade_id: string }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          initiator_cards: Json
          initiator_confirmed_at: string | null
          initiator_user_id: string
          metadata: Json | null
          recipient_cards: Json
          recipient_confirmed_at: string | null
          recipient_user_id: string
          status: string
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "trades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_manage_card_image_object: {
        Args: { _name: string }
        Returns: boolean
      }
      cancel_marketplace_listing: {
        Args: { _listing_id: string }
        Returns: {
          asking_price: number | null
          card_id: string
          card_name: string
          card_number: string | null
          condition: string
          created_at: string
          description: string | null
          expires_at: string | null
          featured: boolean
          grade_company: string | null
          grade_score: number | null
          id: string
          image_url: string | null
          image_url_small: string | null
          interested_count: number
          is_graded: boolean
          listing_type: string
          quantity: number
          rarity: string | null
          set_id: string | null
          set_name: string | null
          status: string
          trade_preferences: string | null
          updated_at: string
          user_card_id: string
          user_id: string
          views_count: number
        }
        SetofOptions: {
          from: "*"
          to: "marketplace_listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_trade: {
        Args: { _trade_id: string }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          initiator_cards: Json
          initiator_confirmed_at: string | null
          initiator_user_id: string
          metadata: Json | null
          recipient_cards: Json
          recipient_confirmed_at: string | null
          recipient_user_id: string
          status: string
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "trades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_trade_receipt: {
        Args: { _trade_id: string }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          initiator_cards: Json
          initiator_confirmed_at: string | null
          initiator_user_id: string
          metadata: Json | null
          recipient_cards: Json
          recipient_confirmed_at: string | null
          recipient_user_id: string
          status: string
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "trades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_marketplace_listing: {
        Args: {
          _description?: string
          _expires_at?: string
          _trade_preferences?: string
          _user_card_id: string
        }
        Returns: {
          asking_price: number | null
          card_id: string
          card_name: string
          card_number: string | null
          condition: string
          created_at: string
          description: string | null
          expires_at: string | null
          featured: boolean
          grade_company: string | null
          grade_score: number | null
          id: string
          image_url: string | null
          image_url_small: string | null
          interested_count: number
          is_graded: boolean
          listing_type: string
          quantity: number
          rarity: string | null
          set_id: string | null
          set_name: string | null
          status: string
          trade_preferences: string | null
          updated_at: string
          user_card_id: string
          user_id: string
          views_count: number
        }
        SetofOptions: {
          from: "*"
          to: "marketplace_listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decline_trade: {
        Args: { _trade_id: string }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          initiator_cards: Json
          initiator_confirmed_at: string | null
          initiator_user_id: string
          metadata: Json | null
          recipient_cards: Json
          recipient_confirmed_at: string | null
          recipient_user_id: string
          status: string
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "trades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_nav_metrics_summary: { Args: { _days?: number }; Returns: Json }
      get_or_create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_trade_destination_address: {
        Args: { _trade_id: string }
        Returns: Json
      }
      get_trade_shipments: {
        Args: { _trade_id: string }
        Returns: {
          carrier: string
          delivered_at: string
          id: string
          recipient_user_id: string
          sender_user_id: string
          shipped_at: string
          status: string
          tracking_number: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_listing_views: {
        Args: { listing_id: string }
        Returns: undefined
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_conversation_messages_read: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      mark_notifications_read: {
        Args: { notification_ids: string[] }
        Returns: undefined
      }
      mark_trade_shipped: {
        Args: { _carrier: string; _tracking: string; _trade_id: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "trade_shipments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      open_trade_dispute: {
        Args: { _reason: string; _trade_id: string }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          initiator_cards: Json
          initiator_confirmed_at: string | null
          initiator_user_id: string
          metadata: Json | null
          recipient_cards: Json
          recipient_confirmed_at: string | null
          recipient_user_id: string
          status: string
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "trades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      propose_trade: {
        Args: {
          _listing_id: string
          _message?: string
          _offered_user_card_ids: string[]
        }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          initiator_cards: Json
          initiator_confirmed_at: string | null
          initiator_user_id: string
          metadata: Json | null
          recipient_cards: Json
          recipient_confirmed_at: string | null
          recipient_user_id: string
          status: string
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "trades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_trade_address: {
        Args: { _address: Json; _trade_id: string }
        Returns: {
          address: Json
          created_at: string
          id: string
          trade_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "trade_addresses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_marketplace_listing: {
        Args: {
          _description?: string
          _expires_at?: string
          _listing_id: string
          _trade_preferences?: string
        }
        Returns: {
          asking_price: number | null
          card_id: string
          card_name: string
          card_number: string | null
          condition: string
          created_at: string
          description: string | null
          expires_at: string | null
          featured: boolean
          grade_company: string | null
          grade_score: number | null
          id: string
          image_url: string | null
          image_url_small: string | null
          interested_count: number
          is_graded: boolean
          listing_type: string
          quantity: number
          rarity: string | null
          set_id: string | null
          set_name: string | null
          status: string
          trade_preferences: string | null
          updated_at: string
          user_card_id: string
          user_id: string
          views_count: number
        }
        SetofOptions: {
          from: "*"
          to: "marketplace_listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_card_locked_in_live_trade: {
        Args: { _user_card_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

