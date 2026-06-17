import { createClient } from "@supabase/supabase-js";

// Cliente PÚBLICO (anon). Lee el escaparate (menú/promos).
// Seguro de exponer: RLS solo permite leer datos públicos.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
