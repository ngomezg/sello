"use client";
import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Check, Pause, Clock } from "lucide-react";

const ESTADO_LABEL = {
  activo:           { t: "Activo",          c: "ok"   },
  por_vencer:       { t: "Por vencer",      c: "warn" },
  vencido:          { t: "Vencido",         c: "bad"  },
  suspendido:       { t: "Suspendido",      c: "bad"  },
  sin_vencimiento:  { t: "Sin vencimiento", c: "ok"   },
};

// Convierte cantidad + unidad a días para el RPC que ya existe en Supabase.
function toDias(cantidad, unidad) {
  const n = parseInt(cantidad, 10) || 1;
  if (unidad === "meses") return n * 30;
  if (unidad === "años")  return n * 365;
  return n; // días directo
}

export default function Pagos() {
  const [negocios, setNegocios] = useState(null);
  const [autorizado, setAutorizado] = useState(true);
  // Por cada handle guardamos { cantidad, unidad }
  const [periodos, setPeriodos] = useState({});
  const [busy, setBusy] = useState("");
  const supabase = supabaseBrowser();

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_listar_negocios");
    if (error) return;
    if (data?.error === "no autorizado") { setAutorizado(false); return; }
    setNegocios(data.negocios || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function getPeriodo(handle) {
    return periodos[handle] || { cantidad: 1, unidad: "meses" };
  }
  function setPeriodo(handle, patch) {
    setPeriodos(prev => ({ ...prev, [handle]: { ...getPeriodo(handle), ...patch } }));
  }

  async function confirmarPago(handle) {
    setBusy(handle);
    const { cantidad, unidad } = getPeriodo(handle);
    const dias = toDias(cantidad, unidad);
    await supabase.rpc("admin_marcar_pago", { p_handle: handle, p_dias: dias });
    await cargar();
    setBusy("");
  }

  async function suspender(handle) {
    if (!confirm(`¿Suspender ${handle}? Su InfoLink dejará de mostrarse.`)) return;
    setBusy(handle);
    await supabase.rpc("admin_suspender", { p_handle: handle });
    await cargar();
    setBusy("");
  }

  if (!autorizado) return (
    <div className="onboard">
      <h2>Sección solo para el administrador</h2>
      <p>Tu cuenta no tiene ese rol.</p>
    </div>
  );
  if (negocios === null) return <div className="loading">Cargando negocios…</div>;

  return (
    <>
      <header className="ph">
        <h1>Pagos</h1>
        <span className="ph-sub">{negocios.length} negocio{negocios.length !== 1 ? "s" : ""}</span>
      </header>

      <p className="muted" style={{ marginBottom: 14 }}>
        Confirma aquí cuando veas el pago en tu cuenta o Nequi. Elige cuánto
        tiempo extiendes el acceso, puede ser días, meses o años.
      </p>

      {negocios.length === 0 && <p className="muted">Aún no hay negocios registrados.</p>}

      {negocios.map((n) => {
        const est   = ESTADO_LABEL[n.estado] || { t: n.estado, c: "" };
        const vence = n.vence_at ? new Date(n.vence_at).toLocaleDateString("es-CO") : "—";
        const { cantidad, unidad } = getPeriodo(n.handle);

        return (
          <div className="pago-row" key={n.handle}>
            <div className="pago-info">
              <b>{n.nombre}</b>
              <small>/{n.handle} · {n.ciudad || "sin ciudad"} · {n.correo || "sin correo"}</small>
            </div>

            <span className={"pago-badge " + est.c}>{est.t}</span>
            <span className="pago-vence"><Clock size={12} /> {vence}</span>

            {/* Selector de período: cantidad + unidad */}
            <div className="pago-periodo">
              <input
                className="pago-cant"
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setPeriodo(n.handle, { cantidad: e.target.value })}
              />
              <select
                className="pago-unidad"
                value={unidad}
                onChange={(e) => setPeriodo(n.handle, { unidad: e.target.value })}
              >
                <option value="dias">días</option>
                <option value="meses">meses</option>
                <option value="años">años</option>
              </select>
            </div>

            <button className="btn-mini ok" disabled={busy === n.handle}
              onClick={() => confirmarPago(n.handle)}>
              <Check size={13} /> Confirmar
            </button>
            <button className="btn-mini bad" disabled={busy === n.handle}
              onClick={() => suspender(n.handle)}>
              <Pause size={13} /> Suspender
            </button>
          </div>
        );
      })}
    </>
  );
}
