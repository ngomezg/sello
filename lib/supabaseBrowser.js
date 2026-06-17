import { createBrowserClient } from "@supabase/ssr";

// Cliente del navegador con sesión (comparte cookies con el servidor).
// Se usa en el panel para leer datos del dueño (RLS los limita a SU negocio).
export const supabaseBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
