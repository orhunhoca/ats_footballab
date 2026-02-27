 
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
      attendance: {
        Row: {
          attendance_date: string
          created_at: string | null
          group_id: string
          id: string
          notes: string | null
          status: string
          student_id: string
        }
        Insert: {
          attendance_date: string
          created_at?: string | null
          group_id: string
          id?: string
          notes?: string | null
          status: string
          student_id: string
        }
        Update: {
          attendance_date?: string
          created_at?: string | null
          group_id?: string
          id?: string
          notes?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          created_at: string | null
          email: string | null
          experience: string | null
          id: string
          invite_expires_at: string | null
          invite_sent_at: string | null
          invite_status: string | null
          invite_token: string | null
          invited_at: string | null
          license: string | null
          name: string
          phone: string | null
          specialty: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          experience?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_sent_at?: string | null
          invite_status?: string | null
          invite_token?: string | null
          invited_at?: string | null
          license?: string | null
          name: string
          phone?: string | null
          specialty: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          experience?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_sent_at?: string | null
          invite_status?: string | null
          invite_token?: string | null
          invited_at?: string | null
          license?: string | null
          name?: string
          phone?: string | null
          specialty?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_schedule: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          group_id: string
          id: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          group_id: string
          id?: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          group_id?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_schedule_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          age_group: string
          coach_id: string | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          schedule: string | null
          status: string | null
          target_years: string | null
          updated_at: string | null
          work_hour: string | null
        }
        Insert: {
          age_group: string
          coach_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          schedule?: string | null
          status?: string | null
          target_years?: string | null
          updated_at?: string | null
          work_hour?: string | null
        }
        Update: {
          age_group?: string
          coach_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          schedule?: string | null
          status?: string | null
          target_years?: string | null
          updated_at?: string | null
          work_hour?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          scheduled_date: string | null
          sent_at: string | null
          student_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          scheduled_date?: string | null
          sent_at?: string | null
          student_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          scheduled_date?: string | null
          sent_at?: string | null
          student_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          created_at: string | null
          display_order: number | null
          duration_months: number
          id: string
          installment_price: number | null
          installments: number | null
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          duration_months: number
          id?: string
          installment_price?: number | null
          installments?: number | null
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          duration_months?: number
          id?: string
          installment_price?: number | null
          installments?: number | null
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      performance_tests: {
        Row: {
          ai_analysis: string | null
          created_at: string | null
          id: string
          notes: string | null
          student_id: string
          test_date: string
          test_protocol_id: string | null
          test_type: Database["public"]["Enums"]["test_type"] | null
          unit: string
          updated_at: string | null
          value: number
        }
        Insert: {
          ai_analysis?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          student_id: string
          test_date?: string
          test_protocol_id?: string | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          unit: string
          updated_at?: string | null
          value: number
        }
        Update: {
          ai_analysis?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          student_id?: string
          test_date?: string
          test_protocol_id?: string | null
          test_type?: Database["public"]["Enums"]["test_type"] | null
          unit?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_tests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_tests_test_protocol_id_fkey"
            columns: ["test_protocol_id"]
            isOneToOne: false
            referencedRelation: "test_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      student_groups: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          student_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          student_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_groups_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          age: number
          birth_date: string | null
          clothing_payment_status: string | null
          clothing_size: string | null
          created_at: string | null
          email: string | null
          father_name: string | null
          father_phone: string | null
          health_report_submitted: boolean | null
          height_cm: number | null
          id: string
          installment_date: string | null
          membership_end_date: string | null
          mother_name: string | null
          mother_phone: string | null
          name: string
          payment_amount: number | null
          payment_plan: string | null
          payment_status: string | null
          phone: string | null
          photo_url: string | null
          registration_end_date: string | null
          registration_start_date: string | null
          registration_type: string | null
          school: string | null
          second_installment_amount: number | null
          status: string | null
          summer_clothing_paid: boolean | null
          summer_clothing_price: number | null
          updated_at: string | null
          weight_kg: number | null
          winter_clothing_paid: boolean | null
          winter_clothing_price: number | null
          work_group_hour: string | null
        }
        Insert: {
          address?: string | null
          age: number
          birth_date?: string | null
          clothing_payment_status?: string | null
          clothing_size?: string | null
          created_at?: string | null
          email?: string | null
          father_name?: string | null
          father_phone?: string | null
          health_report_submitted?: boolean | null
          height_cm?: number | null
          id?: string
          installment_date?: string | null
          membership_end_date?: string | null
          mother_name?: string | null
          mother_phone?: string | null
          name: string
          payment_amount?: number | null
          payment_plan?: string | null
          payment_status?: string | null
          phone?: string | null
          photo_url?: string | null
          registration_end_date?: string | null
          registration_start_date?: string | null
          registration_type?: string | null
          school?: string | null
          second_installment_amount?: number | null
          status?: string | null
          summer_clothing_paid?: boolean | null
          summer_clothing_price?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          winter_clothing_paid?: boolean | null
          winter_clothing_price?: number | null
          work_group_hour?: string | null
        }
        Update: {
          address?: string | null
          age?: number
          birth_date?: string | null
          clothing_payment_status?: string | null
          clothing_size?: string | null
          created_at?: string | null
          email?: string | null
          father_name?: string | null
          father_phone?: string | null
          health_report_submitted?: boolean | null
          height_cm?: number | null
          id?: string
          installment_date?: string | null
          membership_end_date?: string | null
          mother_name?: string | null
          mother_phone?: string | null
          name?: string
          payment_amount?: number | null
          payment_plan?: string | null
          payment_status?: string | null
          phone?: string | null
          photo_url?: string | null
          registration_end_date?: string | null
          registration_start_date?: string | null
          registration_type?: string | null
          school?: string | null
          second_installment_amount?: number | null
          status?: string | null
          summer_clothing_paid?: boolean | null
          summer_clothing_price?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          winter_clothing_paid?: boolean | null
          winter_clothing_price?: number | null
          work_group_hour?: string | null
        }
        Relationships: []
      }
      test_protocols: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trial_students: {
        Row: {
          age_group: string | null
          assigned_group_id: string | null
          birth_date: string
          created_at: string | null
          id: string
          name: string
          notes: string | null
          parent_name: string
          parent_phone: string
          status: string | null
          trial_date: string | null
          updated_at: string | null
        }
        Insert: {
          age_group?: string | null
          assigned_group_id?: string | null
          birth_date: string
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          parent_name: string
          parent_phone: string
          status?: string | null
          trial_date?: string | null
          updated_at?: string | null
        }
        Update: {
          age_group?: string | null
          assigned_group_id?: string | null
          birth_date?: string
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          parent_name?: string
          parent_phone?: string
          status?: string | null
          trial_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_students_assigned_group_id_fkey"
            columns: ["assigned_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          password: string
          role: string
          username: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          password: string
          role: string
          username: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          password?: string
          role?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_registration_renewals: { Args: never; Returns: undefined }
    }
    Enums: {
      test_type:
        | "10m_dribbling"
        | "20m_sprint"
        | "shooting_accuracy"
        | "passing_accuracy"
        | "dribbling_cone"
        | "coordination"
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
      test_type: [
        "10m_dribbling",
        "20m_sprint",
        "shooting_accuracy",
        "passing_accuracy",
        "dribbling_cone",
        "coordination",
      ],
    },
  },
} as const
