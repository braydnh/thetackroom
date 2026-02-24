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
      ambassador_applications: {
        Row: {
          admin_note: string | null
          created_at: string
          facebook_url: string | null
          follower_count: number | null
          id: string
          instagram_handle: string | null
          motivation: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tiktok_handle: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          facebook_url?: string | null
          follower_count?: number | null
          id?: string
          instagram_handle?: string | null
          motivation: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tiktok_handle?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          facebook_url?: string | null
          follower_count?: number | null
          id?: string
          instagram_handle?: string | null
          motivation?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tiktok_handle?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          listing_id: string | null
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favourites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favourites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_listings: {
        Row: {
          amount_paid: number
          created_at: string
          ends_at: string
          id: string
          listing_id: string
          seller_id: string
          slot: Database["public"]["Enums"]["featured_slot"]
          starts_at: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string
          ends_at: string
          id?: string
          listing_id: string
          seller_id: string
          slot: Database["public"]["Enums"]["featured_slot"]
          starts_at?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string
          ends_at?: string
          id?: string
          listing_id?: string
          seller_id?: string
          slot?: Database["public"]["Enums"]["featured_slot"]
          starts_at?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "featured_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_sellers_import: {
        Row: {
          email: string
          id: string
          imported_at: string
          matched_at: string | null
        }
        Insert: {
          email: string
          id?: string
          imported_at?: string
          matched_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          imported_at?: string
          matched_at?: string | null
        }
        Relationships: []
      }
      listing_images: {
        Row: {
          created_at: string
          display_url: string
          id: string
          is_primary: boolean
          listing_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          display_url: string
          id?: string
          is_primary?: boolean
          listing_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          display_url?: string
          id?: string
          is_primary?: boolean
          listing_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          allows_pickup: boolean
          allows_shipping: boolean
          brand: string | null
          category: Database["public"]["Enums"]["listing_category"]
          condition: Database["public"]["Enums"]["listing_condition"]
          created_at: string
          description: string | null
          favourite_count: number
          id: string
          price: number
          search_vector: unknown
          seller_id: string
          shipping_notes: string | null
          shipping_price: number
          size: string | null
          status: Database["public"]["Enums"]["listing_status"]
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          allows_pickup?: boolean
          allows_shipping?: boolean
          brand?: string | null
          category: Database["public"]["Enums"]["listing_category"]
          condition: Database["public"]["Enums"]["listing_condition"]
          created_at?: string
          description?: string | null
          favourite_count?: number
          id?: string
          price: number
          search_vector?: unknown
          seller_id: string
          shipping_notes?: string | null
          shipping_price?: number
          size?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          allows_pickup?: boolean
          allows_shipping?: boolean
          brand?: string | null
          category?: Database["public"]["Enums"]["listing_category"]
          condition?: Database["public"]["Enums"]["listing_condition"]
          created_at?: string
          description?: string | null
          favourite_count?: number
          id?: string
          price?: number
          search_vector?: unknown
          seller_id?: string
          shipping_notes?: string | null
          shipping_price?: number
          size?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          aftership_tracking_id: string | null
          buyer_confirmed_at: string | null
          buyer_id: string
          created_at: string
          dispute_window_ends_at: string | null
          id: string
          listing_id: string
          payout_completed_at: string | null
          payout_scheduled_at: string | null
          pickup_method: Database["public"]["Enums"]["pickup_method"]
          platform_commission_amt: number
          platform_commission_pct: number
          seller_id: string
          seller_notes: string | null
          seller_payout_amt: number
          shipping_amount: number
          shipping_carrier: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_transfer_id: string | null
          subtotal: number
          tracking_deadline: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          aftership_tracking_id?: string | null
          buyer_confirmed_at?: string | null
          buyer_id: string
          created_at?: string
          dispute_window_ends_at?: string | null
          id?: string
          listing_id: string
          payout_completed_at?: string | null
          payout_scheduled_at?: string | null
          pickup_method?: Database["public"]["Enums"]["pickup_method"]
          platform_commission_amt: number
          platform_commission_pct: number
          seller_id: string
          seller_notes?: string | null
          seller_payout_amt: number
          shipping_amount?: number
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          subtotal: number
          tracking_deadline?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          aftership_tracking_id?: string | null
          buyer_confirmed_at?: string | null
          buyer_id?: string
          created_at?: string
          dispute_window_ends_at?: string | null
          id?: string
          listing_id?: string
          payout_completed_at?: string | null
          payout_scheduled_at?: string | null
          pickup_method?: Database["public"]["Enums"]["pickup_method"]
          platform_commission_amt?: number
          platform_commission_pct?: number
          seller_id?: string
          seller_notes?: string | null
          seller_payout_amt?: number
          shipping_amount?: number
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          subtotal?: number
          tracking_deadline?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          ambassador_since: string | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          founding_seller_since: string | null
          id: string
          is_ambassador: boolean
          is_founding_seller: boolean
          is_suspended: boolean
          location: string | null
          mobile_number: string | null
          role: Database["public"]["Enums"]["user_role"]
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean
          total_purchases: number
          total_sales: number
          updated_at: string
          username: string
        }
        Insert: {
          address?: string | null
          ambassador_since?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          founding_seller_since?: string | null
          id: string
          is_ambassador?: boolean
          is_founding_seller?: boolean
          is_suspended?: boolean
          location?: string | null
          mobile_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          total_purchases?: number
          total_sales?: number
          updated_at?: string
          username: string
        }
        Update: {
          address?: string | null
          ambassador_since?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          founding_seller_since?: string | null
          id?: string
          is_ambassador?: boolean
          is_founding_seller?: boolean
          is_suspended?: boolean
          location?: string | null
          mobile_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          total_purchases?: number
          total_sales?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      listings_search_vector: {
        Args: { r: Database["public"]["Tables"]["listings"]["Row"] }
        Returns: unknown
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      featured_slot: "homepage" | "search_top"
      listing_category: "horse" | "rider" | "sale"
      listing_condition: "new_with_tags" | "like_new" | "good" | "fair" | "worn"
      listing_status:
        | "draft"
        | "active"
        | "reserved"
        | "sold"
        | "suspended"
        | "deleted"
      order_status:
        | "pending_payment"
        | "payment_captured"
        | "awaiting_shipment"
        | "shipped"
        | "delivered"
        | "dispute_window"
        | "completed"
        | "disputed"
        | "refunded"
        | "cancelled"
      pickup_method: "shipping" | "local_pickup"
      user_role: "buyer" | "seller" | "admin"
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
      featured_slot: ["homepage", "search_top"],
      listing_category: ["horse", "rider", "sale"],
      listing_condition: ["new_with_tags", "like_new", "good", "fair", "worn"],
      listing_status: [
        "draft",
        "active",
        "reserved",
        "sold",
        "suspended",
        "deleted",
      ],
      order_status: [
        "pending_payment",
        "payment_captured",
        "awaiting_shipment",
        "shipped",
        "delivered",
        "dispute_window",
        "completed",
        "disputed",
        "refunded",
        "cancelled",
      ],
      pickup_method: ["shipping", "local_pickup"],
      user_role: ["buyer", "seller", "admin"],
    },
  },
} as const

// ── Named type aliases (used throughout the codebase) ──────────────
export type UserRole = "buyer" | "seller" | "admin";
export type ListingStatus = "draft" | "active" | "reserved" | "sold" | "suspended" | "deleted";
export type ListingCondition = "new_with_tags" | "like_new" | "good" | "fair" | "worn";
export type ListingCategory = "horse" | "rider" | "sale";
export type OrderStatus =
  | "pending_payment"
  | "payment_captured"
  | "awaiting_shipment"
  | "shipped"
  | "delivered"
  | "dispute_window"
  | "completed"
  | "disputed"
  | "refunded"
  | "cancelled";
export type PickupMethod = "shipping" | "local_pickup";
