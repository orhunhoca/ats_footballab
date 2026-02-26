 
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

import type { Database as DatabaseGenerated } from "./database.types"
export type { DatabaseGenerated as Database }

// Helper types for easier usage
export type Tables<T extends keyof DatabaseGenerated["public"]["Tables"]> =
  DatabaseGenerated["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof DatabaseGenerated["public"]["Tables"]> =
  DatabaseGenerated["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof DatabaseGenerated["public"]["Tables"]> =
  DatabaseGenerated["public"]["Tables"][T]["Update"]

export type Enums<T extends keyof DatabaseGenerated["public"]["Enums"]> =
  DatabaseGenerated["public"]["Enums"][T]