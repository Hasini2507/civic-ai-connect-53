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
      complaint_activities: {
        Row: {
          action: string
          actor_id: string | null
          complaint_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["complaint_status"] | null
          id: string
          metadata: Json | null
          note: string | null
          to_status: Database["public"]["Enums"]["complaint_status"] | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          complaint_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["complaint_status"] | null
          id?: string
          metadata?: Json | null
          note?: string | null
          to_status?: Database["public"]["Enums"]["complaint_status"] | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          complaint_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["complaint_status"] | null
          id?: string
          metadata?: Json | null
          note?: string | null
          to_status?: Database["public"]["Enums"]["complaint_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "complaint_activities_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_media: {
        Row: {
          complaint_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          public_url: string | null
          storage_path: string
        }
        Insert: {
          complaint_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["media_kind"]
          public_url?: string | null
          storage_path: string
        }
        Update: {
          complaint_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          public_url?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_media_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_supporters: {
        Row: {
          complaint_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          complaint_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          complaint_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_supporters_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          address: string | null
          ai_analysis: Json | null
          assigned_officer_id: string | null
          category: Database["public"]["Enums"]["complaint_category"]
          created_at: string
          department_id: string | null
          description: string
          id: string
          is_anonymous: boolean
          latitude: number | null
          longitude: number | null
          priority_level: Database["public"]["Enums"]["priority_level"]
          priority_score: number
          reporter_id: string
          resolved_at: string | null
          severity: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          supporter_count: number
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["complaint_visibility"]
        }
        Insert: {
          address?: string | null
          ai_analysis?: Json | null
          assigned_officer_id?: string | null
          category?: Database["public"]["Enums"]["complaint_category"]
          created_at?: string
          department_id?: string | null
          description: string
          id?: string
          is_anonymous?: boolean
          latitude?: number | null
          longitude?: number | null
          priority_level?: Database["public"]["Enums"]["priority_level"]
          priority_score?: number
          reporter_id: string
          resolved_at?: string | null
          severity?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          supporter_count?: number
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["complaint_visibility"]
        }
        Update: {
          address?: string | null
          ai_analysis?: Json | null
          assigned_officer_id?: string | null
          category?: Database["public"]["Enums"]["complaint_category"]
          created_at?: string
          department_id?: string | null
          description?: string
          id?: string
          is_anonymous?: boolean
          latitude?: number | null
          longitude?: number | null
          priority_level?: Database["public"]["Enums"]["priority_level"]
          priority_score?: number
          reporter_id?: string
          resolved_at?: string | null
          severity?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          supporter_count?: number
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["complaint_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "complaints_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          contact_email: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          contact_email?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          contact_email?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          complaint_id: string | null
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          complaint_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          complaint_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_contacts: {
        Row: {
          created_at: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_contacts_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department_id: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_configurations: {
        Row: {
          category: Database["public"]["Enums"]["complaint_category"]
          created_at: string
          hours_to_resolve: number
          id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["complaint_category"]
          created_at?: string
          hours_to_resolve: number
          id?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["complaint_category"]
          created_at?: string
          hours_to_resolve?: number
          id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "citizen"
        | "officer"
        | "supervisor"
        | "engineer"
        | "commissioner"
        | "admin"
      complaint_category:
        | "pothole"
        | "road_damage"
        | "drainage_blockage"
        | "water_leakage"
        | "garbage_overflow"
        | "streetlight_failure"
        | "open_manhole"
        | "fallen_tree"
        | "traffic_signal_damage"
        | "public_infrastructure_damage"
        | "other"
      complaint_status:
        | "submitted"
        | "under_review"
        | "assigned"
        | "in_progress"
        | "waiting_for_verification"
        | "resolved"
        | "verified"
        | "closed"
        | "rejected"
      complaint_visibility: "public" | "private"
      media_kind: "image" | "video" | "audio"
      priority_level: "low" | "medium" | "high" | "critical"
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
      app_role: [
        "citizen",
        "officer",
        "supervisor",
        "engineer",
        "commissioner",
        "admin",
      ],
      complaint_category: [
        "pothole",
        "road_damage",
        "drainage_blockage",
        "water_leakage",
        "garbage_overflow",
        "streetlight_failure",
        "open_manhole",
        "fallen_tree",
        "traffic_signal_damage",
        "public_infrastructure_damage",
        "other",
      ],
      complaint_status: [
        "submitted",
        "under_review",
        "assigned",
        "in_progress",
        "waiting_for_verification",
        "resolved",
        "verified",
        "closed",
        "rejected",
      ],
      complaint_visibility: ["public", "private"],
      media_kind: ["image", "video", "audio"],
      priority_level: ["low", "medium", "high", "critical"],
    },
  },
} as const
