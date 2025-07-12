import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          location: string | null
          profile_photo: string | null
          availability: string | null
          is_public: boolean
          is_admin: boolean
          is_banned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          location?: string | null
          profile_photo?: string | null
          availability?: string | null
          is_public?: boolean
          is_admin?: boolean
          is_banned?: boolean
        }
        Update: {
          name?: string
          location?: string | null
          profile_photo?: string | null
          availability?: string | null
          is_public?: boolean
        }
      }
      skills: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          type: "offered" | "wanted"
          is_approved: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          name: string
          description?: string | null
          type: "offered" | "wanted"
          is_approved?: boolean
        }
        Update: {
          name?: string
          description?: string | null
          is_approved?: boolean
        }
      }
      swap_requests: {
        Row: {
          id: string
          requester_id: string
          provider_id: string
          requested_skill_id: string
          offered_skill_id: string
          status: "pending" | "accepted" | "rejected" | "completed" | "cancelled"
          message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          requester_id: string
          provider_id: string
          requested_skill_id: string
          offered_skill_id: string
          message?: string | null
        }
        Update: {
          status?: "pending" | "accepted" | "rejected" | "completed" | "cancelled"
          message?: string | null
        }
      }
      ratings: {
        Row: {
          id: string
          swap_request_id: string
          rater_id: string
          rated_id: string
          rating: number
          feedback: string | null
          created_at: string
        }
        Insert: {
          swap_request_id: string
          rater_id: string
          rated_id: string
          rating: number
          feedback?: string | null
        }
      }
      admin_messages: {
        Row: {
          id: string
          title: string
          message: string
          created_at: string
        }
        Insert: {
          title: string
          message: string
        }
      }
    }
  }
}
