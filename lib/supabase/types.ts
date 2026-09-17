import type { StudentProfile } from "../../types/admissions.ts";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PersistedStudentProfile = Omit<
  StudentProfile,
  "fullName" | "nationality" | "countryOfResidence"
>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          profile: Json;
          step: number;
          completed: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          profile: Json;
          step: number;
          completed: boolean;
          updated_at: string;
        };
        Update: {
          profile?: Json;
          step?: number;
          completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      journey_state: {
        Row: {
          user_id: string;
          selected_program_id: string | null;
          compare_program_ids: Json;
          completed_task_ids: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          selected_program_id: string | null;
          compare_program_ids: Json;
          completed_task_ids: Json;
          updated_at: string;
        };
        Update: {
          selected_program_id?: string | null;
          compare_program_ids?: Json;
          completed_task_ids?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
