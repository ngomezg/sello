"use client";
import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { RefreshCw } from "lucide-react";

const money = (n) => "$" + Number(n).toLocaleString("es-CO");
const COLS = [
  { k: "nuevo", t: "Nuevos" },
  { k: "preparando", t: "Preparando" },
  { k: "listo", t: "Listos" },
  { k: "entregado", t: "Entregados" },
];
const NEXT = { nuevo: "preparando", preparando: "listo", listo: "entregado" };

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const supabase = supabaseBrowser();

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("pedidos").select("id,items,total,estado,created_at")
      .order("created_at", { ascending: false }).limit(60);
    setPedidos(data || []);
  }, []);

  // Refresca cada 8s para ver pedidos entrantes sin recargar
  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 8000);
    return () => clearInterval(id);
  }, [cargar]);

  async function avanzar(p) {
    const sig = NEXT[p.estado];
    if (!sig) return;
    setPedidos((arr) => arr.map((x) => x.id === p.id ? { ...x, estado: sig } : x));
    await supabase.from("pedidos").update({ estado: sig }).eq("id", p.id);
  }

  return (
    <>
      <header className="ph">
        <h1>Pedidos</h1>
        <button className="btn-ghost sm" onClick={cargar}><RefreshCw size={14} /> Actualizar</button>
      </header>
      <div className="kanban">
        {COLS.map((c) => {
          const list = pedidos.filter((p) => p.estado === c.k);
          return (
            <div className="kcol" key={c.k}>
              <div className="kcol-h">{c.t} <span>{list.length}</span></div>
              {list.map((p) => (
                <div className="korder" key={p.id} onClick={() => avanzar(p)}>
                  <div className="korder-top">
                    <b>{money(p.total)}</b>
                    <span className="korder-time">{new Date(p.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="korder-items">
                    {(p.items || []).map((it, i) => (
                      <span key={i}>{it.qty}× {it.nombre}</span>
                    ))}
                  </div>
                  {NEXT[p.estado] && <div className="korder-cta">Tocar → {NEXT[p.estado]}</div>}
                </div>
              ))}
              {list.length === 0 && <div className="kempty">—</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
