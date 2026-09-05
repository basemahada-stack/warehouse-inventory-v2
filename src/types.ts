export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          created_at?: string
        }
      }
      units: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          created_at?: string
        }
      }
      pics: {
        Row: {
          id: string
          name: string
          department: string | null
          position: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          department?: string | null
          position?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          department?: string | null
          position?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      vendors: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          phone: string | null
          address: string | null
          notes: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      in_stock_reasons: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          created_at?: string
        }
      }
      out_stock_reasons: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          product_code: string
          product_name: string
          category_id: string
          unit_id: string
          minimum_stock: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_code: string
          product_name: string
          category_id: string
          unit_id: string
          minimum_stock?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_code?: string
          product_name?: string
          category_id?: string
          unit_id?: string
          minimum_stock?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      stock_in: {
        Row: {
          id: string
          transaction_number: string
          transaction_date: string
          product_id: string
          quantity: number
          vendor_id: string | null
          reason_id: string
          pic_id: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          transaction_number: string
          transaction_date: string
          product_id: string
          quantity: number
          vendor_id?: string | null
          reason_id: string
          pic_id: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          transaction_number?: string
          transaction_date?: string
          product_id?: string
          quantity?: number
          vendor_id?: string | null
          reason_id?: string
          pic_id?: string
          notes?: string | null
          created_at?: string
        }
      }
      stock_out: {
        Row: {
          id: string
          transaction_number: string
          transaction_date: string
          product_id: string
          quantity: number
          reason_id: string
          pic_id: string
          destination: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          transaction_number: string
          transaction_date: string
          product_id: string
          quantity: number
          reason_id: string
          pic_id: string
          destination?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          transaction_number?: string
          transaction_date?: string
          product_id?: string
          quantity?: number
          reason_id?: string
          pic_id?: string
          destination?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      vendor_stock: {
        Row: {
          id: string
          vendor_id: string
          product_id: string
          quantity: number
          unit_id: string
          reference_number: string | null
          stock_date: string
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          product_id: string
          quantity: number
          unit_id: string
          reference_number?: string | null
          stock_date: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          product_id?: string
          quantity?: number
          unit_id?: string
          reference_number?: string | null
          stock_date?: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
