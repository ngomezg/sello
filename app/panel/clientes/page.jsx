"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Stamp } from "lucide-react";

export default function Clientes() {
  const [rows, setRows] = useState([]);
  const supabase = supabaseBrowser();

  useEffect(() => {
    (async () => {
      // Nested select: RLS limita ambas tablas al dueño automáticamente.
      const { data } = await supabase
        .from("tarjetas")
        .select("sellos,premios_ganados,ultima_visita,clientes(nombre,telefono)")
        .order("ultima_visita", { ascending: false }).limit(100);
      setRows(data || []);
    })();
  }, []);

  return (
    <>
      <header className="ph"><h1>Clientes</h1><span className="ph-sub">{rows.length} con tarjeta</span></header>
      <div className="pcard">
        {rows.length === 0 && <p className="muted">Aún no hay clientes con tarjeta.</p>}
        {rows.map((r, i) => (
          <div className="crm" key={i}>
            <div className="crm-av">{(r.clientes?.nombre || "I")[0]}</div>
            <div className="crm-info">
              <b>{r.clientes?.nombre || "Invitado"}</b>
              <small>
                {r.premios_ganados > 0 && `${r.premios_ganados} premio(s) · `}
                {r.ultima_visita ? "Visitó " + new Date(r.ultima_visita).toLocaleDateString("es-CO") : "—"}
              </small>
            </div>
            <div className="crm-seals">{r.sellos}<Stamp size={12} /></div>
          </div>
        ))}
      </div>
    </>
  );
}
