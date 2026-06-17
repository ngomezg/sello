import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de servidor con sesión (lee la cookie de auth).
// Permite proteger rutas y saber quién es el dueño logueado.
export function supabaseServer() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try { list.forEach(({ name, value, options }) => store.set(name, value, options)); }
          catch { /* en Server Components no se puede escribir cookie; el middleware lo cubre */ }
        },
      },
    }
  );
}
