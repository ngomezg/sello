import { supabase } from "@/lib/supabaseClient";
import InfoLink from "@/components/InfoLink";
import { notFound } from "next/navigation";

// Server Component: trae TODO el escaparate en una sola llamada (rápido).
// La URL es /i/[handle]/[slug] — el slug es cosmético (como en Clubify).
export default async function Page({ params }) {
  const { handle } = params;

  const { data, error } = await supabase.rpc("get_infolink", { p_handle: handle });

  if (error || !data?.negocio) {
    // Si el negocio no existe o está inactivo, 404 limpio.
    notFound();
  }

  return <InfoLink data={data} handle={handle} />;
}

// Revalida el escaparate cada 60s (menú no cambia a cada segundo).
export const revalidate = 60;
