// Implementasi Supabase yang aman untuk client-side
import { createClient } from "@supabase/supabase-js"

interface PhotoMetadata {
  created_at: string
  drive_file_id: string
  photo_count: number
  user_id?: string
  drive_link?: string
  metadata?: Record<string, any>
}

// Inisialisasi klien Supabase dengan environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function savePhotoMetadata(metadata: PhotoMetadata): Promise<void> {
  try {
    console.log("Saving metadata to Supabase:", metadata)

    const { error } = await supabase.from("photostrips").insert([metadata])

    if (error) throw error

    console.log("Metadata saved successfully")
  } catch (error) {
    console.error("Error saving to Supabase:", error)
    throw new Error("Failed to save metadata")
  }
}
