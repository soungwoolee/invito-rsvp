import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Event = {
  id: string
  created_at: string
  title: string
  date: string
  location: string | null
  description: string | null
  host_name: string | null
  host_phone: string
  host_key: string
  image_url: string | null
  background_image_url: string | null
  payment_toss_url: string | null
  payment_details: string | null
  punctuality_note: string | null
  audio_url: string | null
}

export type Rsvp = {
  id: number
  event_id: string
  guest_name: string
  phone: string | null
  is_coming: boolean | null
  avatar: string | null
  photo_url: string | null
  plus_one_count: number | null
  companion_names: string | null
  created_at: string
}

export type Activity = {
  id: number
  event_id: string
  name: string
  created_by: string
  created_at: string
}

export type ActivityLike = {
  id: number
  activity_id: number
  guest_name: string
  created_at: string
}

export type Comment = {
  id: number
  event_id: string
  guest_name: string
  content: string
  parent_id: number | null
  created_at: string
}

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}
