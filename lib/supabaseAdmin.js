import { createClient } from "@supabase/supabase-js";

// Cliente ADMIN (service_role). SOLO servidor (API routes).
// Salta RLS, por eso nunca debe llegar al navegador.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
