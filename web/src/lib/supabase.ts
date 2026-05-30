import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      users_profile: {
        Row: {
          id: string
          user_id: string
          name: string | null
          age: number
          sex: 'male' | 'female'
          height_cm: number
          current_weight_kg: number
          target_weight_kg: number
          target_date: string | null
          activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
          tdee: number
          daily_calorie_target: number
          baseline_net_kcal: number | null
          start_weight_kg: number | null
          start_date: string | null
          debt_total_kcal: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Record<string, Json | undefined>
        Update: Record<string, Json | undefined>
        Relationships: []
      }
      foods: {
        Row: {
          id: string
          user_id: string
          name: string
          kcal_per_unit: number
          default_unit: 'g' | 'ml' | 'pieza' | 'porcion'
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          barcode: string | null
          source: 'manual' | 'ai' | 'off'
          times_used: number | null
          last_used_at: string | null
          created_at: string | null
        }
        Insert: Record<string, Json | undefined>
        Update: Record<string, Json | undefined>
        Relationships: []
      }
      food_entries: {
        Row: {
          id: string
          user_id: string
          date: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          name: string
          calories: number
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          fiber_g: number | null
          serving_size: string | null
          photo_url: string | null
          ai_estimated: boolean | null
          notes: string | null
          food_id: string | null
          quantity: number | null
          unit: string | null
          created_at: string | null
        }
        Insert: Record<string, Json | undefined>
        Update: Record<string, Json | undefined>
        Relationships: []
      }
      weight_entries: {
        Row: {
          id: string
          user_id: string
          date: string
          weight_kg: number
          notes: string | null
          created_at: string | null
        }
        Insert: Record<string, Json | undefined>
        Update: Record<string, Json | undefined>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Public Supabase anon config from pwa/index.html. This key is intentionally
// public; row access is controlled by Supabase RLS.
export const publicSupabaseConfig = {
  url: 'https://cpwlxtcafugzaixxzcqn.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwd2x4dGNhZnVnemFpeHh6Y3FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MzE1MDgsImV4cCI6MjA5MTEwNzUwOH0.GOfWyCkPl3MscKyRjDwFrb6oq2DPnULscS-KJ1c-a5A',
} as const

export const supabase: SupabaseClient<Database> = createClient<Database>(
  publicSupabaseConfig.url,
  publicSupabaseConfig.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
    },
  }
)
