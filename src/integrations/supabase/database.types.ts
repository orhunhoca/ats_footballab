 
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
      bank_accounts: {
        Row: {
          account_holder: string
          bank_branch: string | null
          bank_name: string
          branch_id: string | null
          created_at: string
          description: string | null
          iban: string
          id: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_holder: string
          bank_branch?: string | null
          bank_name: string
          branch_id?: string | null
          created_at?: string
          description?: string | null
          iban: string
          id?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_holder?: string
          bank_branch?: string | null
          bank_name?: string
          branch_id?: string | null
          created_at?: string
          description?: string | null
          iban?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coaches: {
        Row: {
          branch_access: string
          branch_id: string | null
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
          specialty: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          branch_access?: string
          branch_id?: string | null
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
          specialty?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          branch_access?: string
          branch_id?: string | null
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
          specialty?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          parent_portal_enabled: boolean
          address: string | null
          email: string | null
          id: string
          kep_address: string | null
          kvkk_contact_email: string | null
          legal_name: string | null
          mersis_no: string | null
          phone: string | null
          singleton: boolean
          tax_number: string | null
          tax_office: string | null
          updated_at: string
          verbis_number: string | null
          website: string | null
        }
        Insert: {
          parent_portal_enabled?: boolean
          address?: string | null
          email?: string | null
          id?: string
          kep_address?: string | null
          kvkk_contact_email?: string | null
          legal_name?: string | null
          mersis_no?: string | null
          phone?: string | null
          singleton?: boolean
          tax_number?: string | null
          tax_office?: string | null
          updated_at?: string
          verbis_number?: string | null
          website?: string | null
        }
        Update: {
          parent_portal_enabled?: boolean
          address?: string | null
          email?: string | null
          id?: string
          kep_address?: string | null
          kvkk_contact_email?: string | null
          legal_name?: string | null
          mersis_no?: string | null
          phone?: string | null
          singleton?: boolean
          tax_number?: string | null
          tax_office?: string | null
          updated_at?: string
          verbis_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      consents: {
        Row: {
          accepted: boolean
          accepted_at: string
          document_type: string
          document_version: string
          id: string
          ip: string | null
          source: string
          student_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted: boolean
          accepted_at?: string
          document_type: string
          document_version: string
          id?: string
          ip?: string | null
          source?: string
          student_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted?: boolean
          accepted_at?: string
          document_type?: string
          document_version?: string
          id?: string
          ip?: string | null
          source?: string
          student_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          template_content: Json
          template_name: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template_content: Json
          template_name: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template_content?: Json
          template_name?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
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
      group_training_assignments: {
        Row: {
          attendance_count: number | null
          created_at: string | null
          created_by: string | null
          group_id: string
          id: string
          notes: string | null
          scheduled_date: string
          status: string
          training_program_id: string
          updated_at: string | null
        }
        Insert: {
          attendance_count?: number | null
          created_at?: string | null
          created_by?: string | null
          group_id: string
          id?: string
          notes?: string | null
          scheduled_date: string
          status?: string
          training_program_id: string
          updated_at?: string | null
        }
        Update: {
          attendance_count?: number | null
          created_at?: string | null
          created_by?: string | null
          group_id?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          status?: string
          training_program_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_training_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_training_assignments_training_program_id_fkey"
            columns: ["training_program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: "groups_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      iyzico_settings: {
        Row: {
          api_key: string | null
          base_url: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          secret_key: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          secret_key?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          secret_key?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      message_scheduler_settings: {
        Row: {
          created_at: string | null
          days_before: number | null
          enabled: boolean | null
          hours_before: number | null
          id: string
          message_text: string | null
          send_time: string | null
          setting_type: string
          template_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_before?: number | null
          enabled?: boolean | null
          hours_before?: number | null
          id?: string
          message_text?: string | null
          send_time?: string | null
          setting_type: string
          template_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_before?: number | null
          enabled?: boolean | null
          hours_before?: number | null
          id?: string
          message_text?: string | null
          send_time?: string | null
          setting_type?: string
          template_name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      online_payments: {
        Row: {
          amount: number
          callback_url: string | null
          completed_at: string | null
          conversation_id: string
          created_at: string | null
          error_message: string | null
          expires_at: string
          id: string
          iyzico_payment_id: string | null
          payment_history_id: string | null
          payment_link: string
          payment_type: string
          status: string
          student_id: string
          token: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          callback_url?: string | null
          completed_at?: string | null
          conversation_id: string
          created_at?: string | null
          error_message?: string | null
          expires_at: string
          id?: string
          iyzico_payment_id?: string | null
          payment_history_id?: string | null
          payment_link: string
          payment_type?: string
          status?: string
          student_id: string
          token?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          callback_url?: string | null
          completed_at?: string | null
          conversation_id?: string
          created_at?: string | null
          error_message?: string | null
          expires_at?: string
          id?: string
          iyzico_payment_id?: string | null
          payment_history_id?: string | null
          payment_link?: string
          payment_type?: string
          status?: string
          student_id?: string
          token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_payments_payment_history_id_fkey"
            columns: ["payment_history_id"]
            isOneToOne: false
            referencedRelation: "payment_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_invites: {
        Row: {
          code_hash: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          is_active: boolean
          max_uses: number
          student_id: string
          used_count: number
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          is_active?: boolean
          max_uses?: number
          student_id: string
          used_count?: number
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number
          student_id?: string
          used_count?: number
        }
        Relationships: []
      }
      parent_students: {
        Row: {
          created_at: string
          parent_user_id: string
          relation: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          parent_user_id: string
          relation?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          parent_user_id?: string
          relation?: string | null
          student_id?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          bank_account_id: string | null
          branch_id: string | null
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          installment_number: number | null
          notes: string | null
          payment_date: string
          payment_method: string
          payment_type: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          bank_account_id?: string | null
          branch_id?: string | null
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          installment_number?: number | null
          notes?: string | null
          payment_date?: string
          payment_method: string
          payment_type: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          bank_account_id?: string | null
          branch_id?: string | null
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          installment_number?: number | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_type?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_charges: {
        Row: {
          id: string
          student_id: string
          branch_id: string | null
          charge_type: string
          description: string | null
          amount: number
          due_date: string
          installment_no: number | null
          is_cancelled: boolean
          cancelled_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          branch_id?: string | null
          charge_type?: string
          description?: string | null
          amount: number
          due_date: string
          installment_no?: number | null
          is_cancelled?: boolean
          cancelled_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          branch_id?: string | null
          charge_type?: string
          description?: string | null
          amount?: number
          due_date?: string
          installment_no?: number | null
          is_cancelled?: boolean
          cancelled_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
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
      scheduled_messages: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          message_type: string
          recipient_name: string | null
          recipient_phone: string
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          student_id: string | null
          template_name: string
          template_variables: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_type: string
          recipient_name?: string | null
          recipient_phone: string
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          student_id?: string | null
          template_name: string
          template_variables?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_type?: string
          recipient_name?: string | null
          recipient_phone?: string
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          student_id?: string | null
          template_name?: string
          template_variables?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
          kvkk_consent_at: string | null
          kvkk_consent_by: string | null
          branch_id: string | null
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
          kvkk_consent_at?: string | null
          kvkk_consent_by?: string | null
          branch_id?: string | null
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
          kvkk_consent_at?: string | null
          kvkk_consent_by?: string | null
          branch_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "students_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
      training_exercises: {
        Row: {
          coaching_points: string[] | null
          created_at: string | null
          duration_minutes: number
          equipment_needed: string[] | null
          exercise_name: string
          id: string
          instructions: string
          order_number: number
          program_id: string
        }
        Insert: {
          coaching_points?: string[] | null
          created_at?: string | null
          duration_minutes: number
          equipment_needed?: string[] | null
          exercise_name: string
          id?: string
          instructions: string
          order_number: number
          program_id: string
        }
        Update: {
          coaching_points?: string[] | null
          created_at?: string | null
          duration_minutes?: number
          equipment_needed?: string[] | null
          exercise_name?: string
          id?: string
          instructions?: string
          order_number?: number
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_exercises_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string
          duration_minutes: number
          id: string
          name: string
          objectives: string[] | null
          session_number: number
          updated_at: string | null
          week_number: number
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level: string
          duration_minutes: number
          id?: string
          name: string
          objectives?: string[] | null
          session_number: number
          updated_at?: string | null
          week_number: number
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string
          duration_minutes?: number
          id?: string
          name?: string
          objectives?: string[] | null
          session_number?: number
          updated_at?: string | null
          week_number?: number
        }
        Relationships: []
      }
      trial_students: {
        Row: {
          branch_id: string | null
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
          branch_id?: string | null
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
          branch_id?: string | null
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
            foreignKeyName: "trial_students_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
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
      whatsapp_chatbot_logs: {
        Row: {
          bot_response: string
          command_type: string | null
          created_at: string | null
          id: string
          incoming_message: string
          phone_number: string
          student_id: string | null
        }
        Insert: {
          bot_response: string
          command_type?: string | null
          created_at?: string | null
          id?: string
          incoming_message: string
          phone_number: string
          student_id?: string | null
        }
        Update: {
          bot_response?: string
          command_type?: string | null
          created_at?: string | null
          id?: string
          incoming_message?: string
          phone_number?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_chatbot_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_media: {
        Row: {
          caption: string | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          group_id: string | null
          id: string
          media_type: string
          media_url: string
          mime_type: string | null
          sent_at: string | null
          sent_to: Json | null
          student_id: string | null
          updated_at: string | null
          whatsapp_media_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          group_id?: string | null
          id?: string
          media_type: string
          media_url: string
          mime_type?: string | null
          sent_at?: string | null
          sent_to?: Json | null
          student_id?: string | null
          updated_at?: string | null
          whatsapp_media_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          group_id?: string | null
          id?: string
          media_type?: string
          media_url?: string
          mime_type?: string | null
          sent_at?: string | null
          sent_to?: Json | null
          student_id?: string | null
          updated_at?: string | null
          whatsapp_media_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_media_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_media_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          incoming_message_id: string | null
          message_content: string | null
          message_type: string | null
          read_at: string | null
          recipient_name: string | null
          recipient_phone: string
          sent_at: string | null
          status: string | null
          student_id: string | null
          template_id: string | null
          template_name: string | null
          template_variables: Json | null
          whatsapp_message_id: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          incoming_message_id?: string | null
          message_content?: string | null
          message_type?: string | null
          read_at?: string | null
          recipient_name?: string | null
          recipient_phone: string
          sent_at?: string | null
          status?: string | null
          student_id?: string | null
          template_id?: string | null
          template_name?: string | null
          template_variables?: Json | null
          whatsapp_message_id?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          incoming_message_id?: string | null
          message_content?: string | null
          message_type?: string | null
          read_at?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          sent_at?: string | null
          status?: string | null
          student_id?: string | null
          template_id?: string | null
          template_name?: string | null
          template_variables?: Json | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          access_token: string | null
          business_account_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          phone_number_id: string | null
          updated_at: string | null
          webhook_verify_token: string | null
        }
        Insert: {
          access_token?: string | null
          business_account_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number_id?: string | null
          updated_at?: string | null
          webhook_verify_token?: string | null
        }
        Update: {
          access_token?: string | null
          business_account_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number_id?: string | null
          updated_at?: string | null
          webhook_verify_token?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          created_at: string | null
          id: string
          language: string | null
          message_content: string
          status: string | null
          template_id: string | null
          template_name: string
          template_type: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          language?: string | null
          message_content: string
          status?: string | null
          template_id?: string | null
          template_name: string
          template_type?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string | null
          message_content?: string
          status?: string | null
          template_id?: string | null
          template_name?: string
          template_type?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      student_charge_status: {
        Row: {
          id: string
          student_id: string
          branch_id: string | null
          charge_type: string
          description: string | null
          amount: number
          due_date: string
          installment_no: number | null
          created_at: string
          paid_amount: number
          remaining_amount: number
          is_overdue: boolean
        }
        Relationships: []
      }
      student_balances: {
        Row: {
          student_id: string
          branch_id: string | null
          total_charged: number
          total_paid: number
          balance: number
          overdue_amount: number
          next_due_date: string | null
          next_due_amount: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_registration_renewals: { Args: never; Returns: undefined }
      get_public_company_info: { Args: never; Returns: Json }
      is_parent_registration_open: { Args: never; Returns: boolean }
      create_parent_invite: {
        Args: { p_student_id: string; p_max_uses?: number; p_days?: number }
        Returns: string
      }
      revoke_parent_invite: { Args: { p_invite_id: string }; Returns: undefined }
      list_student_parents: {
        Args: { p_student_id: string }
        Returns: {
          parent_user_id: string
          full_name: string | null
          email: string | null
          relation: string | null
          linked_at: string
          is_active: boolean
        }[]
      }
      get_my_children: { Args: never; Returns: Json }
      get_attendance_report: { Args: { p_from: string; p_to: string; p_branch?: string | null; p_group?: string | null }; Returns: Json }
      get_performance_report: { Args: { p_from: string; p_to: string; p_branch?: string | null }; Returns: Json }
      get_finance_report: { Args: { p_from: string; p_to: string; p_branch?: string | null }; Returns: Json }
      get_my_child_ledger: { Args: { p_student_id: string }; Returns: Json }
      get_my_child_attendance: { Args: { p_student_id: string; p_limit?: number }; Returns: Json }
      get_my_child_performance: { Args: { p_student_id: string }; Returns: Json }
      get_my_child_gallery: { Args: { p_student_id: string }; Returns: Json }
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
