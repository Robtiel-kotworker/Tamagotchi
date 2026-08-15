import { createClient } from "@supabase/supabase-js";

const supabaseUrl = https://fogeclfrpgsbckjqiopz.supabase.co/;
const supabaseAnonKey = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZ2VjbGZycGdzYmNranFpb3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3OTc2ODMsImV4cCI6MjEwMjM3MzY4M30.XLkDDvrdiX-1t9FTf1-_Ra0WhRmuPlmHnbssfSDof-E;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase-Umgebungsvariablen fehlen. Bitte VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in der .env-Datei setzen."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
