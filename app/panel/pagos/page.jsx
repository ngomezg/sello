"use client";
import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Check, Pause, Clock, Plus, X, Copy, ExternalLink } from "lucide-react";

const ESTADO_LABEL = {
  activo:          { t: "Activo",          c: "ok"   },
  por_vencer:      { t: "Por vencer",      c: "warn" },
  vencido:         { t: "Vencido",         c: "bad"  },
  suspendido:      { t: "Suspendido",      c: "bad"  },
  sin_vencimiento: { t: "Sin vencimiento", c: "ok"   },
};

function toDias(cantidad, unidad) {
  const n = parseInt(cantidad, 10) || 1;
  if (unidad === "meses") return n * 30;
  if (unidad === "años")  return n * 365;
  return n;
}

const FORM_VACIO = { nombre: "", handle: "", ciudad: "", whatsapp: "" };

export default function Pagos() {
  const [negocios, setNegocios]   = useState(null);
  const [autorizado, setAutorizado] = useState(true);
  const [periodos, setPeriodos]   = useState({});
  const [busy, setBusy]           = useState("");

  // Modal crear negocio
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(FORM_VACIO);
  const [formErr, setFormErr]     = useState("");
  const [creando, setCreando]     = useState(false);
  const [linkGenerado, setLinkGenerado] = useState(""); // link para compartir al cliente
  const [copiado, setCopiado]     = useState(false);

  const supabase = supabaseBrowser();

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc("admin_listar_negocios");
    if (data?.error === "no autorizado") { setAutorizado(false); return; }
    setNegocios(data?.negocios || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function getPeriodo(handle) {
    return periodos[handle] || { cantidad: 1, unidad: "meses" };
  }
  function setPeriodo(handle, patch) {
    setPeriodos(p => ({ ...p, [handle]: { ...getPeriodo(handle), ...patch } }));
  }

  async function confirmarPago(handle) {
    setBusy(handle);
    const { cantidad, unidad } = getPeriodo(handle);
    await supabase.rpc("admin_marcar_pago", { p_handle: handle, p_dias: toDias(cantidad, unidad) });
    await cargar(); setBusy("");
  }

  async function suspender(handle) {
    if (!confirm(`¿Suspender ${handle}? Su InfoLink dejará de mostrarse.`)) return;
    setBusy(handle);
    await supabase.rpc("admin_suspender", { p_handle: handle });
    await cargar(); setBusy("");
  }

  async function crearNegocio() {
    setFormErr(""); setCreando(true);
    const handle = form.handle.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!form.nombre.trim() || !handle) {
      setFormErr("El nombre y el identificador son obligatorios.");
      setCreando(false); return;
    }
    const { data, error } = await supabase.rpc("admin_crear_negocio", {
      p_handle:   handle,
      p_nombre:   form.nombre.trim(),
      p_ciudad:   form.ciudad.trim() || null,
      p_whatsapp: form.whatsapp.trim() || null,
    });
    setCreando(false);
    if (error || data?.error) { setFormErr(data?.error || error.message); return; }
    // Genera el link de registro que le vas a compartir al cliente.
    const link = `${window.location.origin}/registro?negocio=${handle}`;
    setLinkGenerado(link);
    await cargar();
  }

  function copiar() {
    navigator.clipboard.writeText(linkGenerado).then(() => {
      setCopiado(true); setTimeout(() => setCopiado(false), 2000);
    });
  }

  function cerrarModal() {
    setShowModal(false); setForm(FORM_VACIO);
    setFormErr(""); setLinkGenerado(""); setCopiado(false);
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
        <button className="btn-primary sm" onClick={() => { setShowModal(true); setLinkGenerado(""); }}>
          <Plus size={15} /> Crear negocio
        </button>
      </header>

      <p className="muted" style={{ marginBottom: 14 }}>
        {negocios.length} negocio{negocios.length !== 1 ? "s" : ""} registrados.
        Confirma aquí cuando veas el pago en tu cuenta o Nequi.
      </p>

      {negocios.length === 0 && <p className="muted">Aún no hay negocios. Crea el primero.</p>}

      {negocios.map((n) => {
        const est   = ESTADO_LABEL[n.estado] || { t: n.estado, c: "" };
        const vence = n.vence_at ? new Date(n.vence_at).toLocaleDateString("es-CO") : "—";
        const { cantidad, unidad } = getPeriodo(n.handle);
        return (
          <div className="pago-row" key={n.handle}>
            <div className="pago-info">
              <b>{n.nombre}</b>
              <small>/{n.handle} · {n.ciudad || "sin ciudad"} · {n.correo || "sin dueño aún"}</small>
            </div>
            <span className={"pago-badge " + est.c}>{est.t}</span>
            <span className="pago-vence"><Clock size={12} /> {vence}</span>
            <div className="pago-periodo">
              <input className="pago-cant" type="number" min="1" value={cantidad}
                onChange={(e) => setPeriodo(n.handle, { cantidad: e.target.value })} />
              <select className="pago-unidad" value={unidad}
                onChange={(e) => setPeriodo(n.handle, { unidad: e.target.value })}>
                <option value="dias">días</option>
                <option value="meses">meses</option>
                <option value="años">años</option>
              </select>
            </div>
            <button className="btn-mini ok" disabled={busy === n.handle} onClick={() => confirmarPago(n.handle)}>
              <Check size={13} /> Confirmar
            </button>
            <button className="btn-mini bad" disabled={busy === n.handle} onClick={() => suspender(n.handle)}>
              <Pause size={13} /> Suspender
            </button>
          </div>
        );
      })}

      {/* ── Modal: crear negocio ── */}
      {showModal && (
        <div className="sheet-bg" onClick={(e) => e.target.classList.contains("sheet-bg") && cerrarModal()}>
          <div className="sheet">
            <div className="sheet-head">
              <b>{linkGenerado ? "Negocio creado" : "Nuevo negocio"}</b>
              <button onClick={cerrarModal}><X size={18} /></button>
            </div>

            {!linkGenerado ? (
              <>
                <p className="muted" style={{ marginBottom: 12 }}>
                  Crea el negocio aquí y luego comparte el link de registro con tu cliente.
                </p>
                <label className="lbl">Nombre del negocio</label>
                <input className="inp" placeholder="Café del Valle"
                  value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />

                <label className="lbl">Identificador para la URL</label>
                <input className="inp" placeholder="cafedelvalle (solo letras y guiones)"
                  value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
                <small className="muted" style={{ marginTop: -8, marginBottom: 8, display: "block" }}>
                  Quedará en: /i/<b>{form.handle || "identificador"}</b>/menu
                </small>

                <label className="lbl">Ciudad (opcional)</label>
                <input className="inp" placeholder="Bogotá, CO"
                  value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />

                <label className="lbl">WhatsApp (opcional)</label>
                <input className="inp" placeholder="573001112233"
                  value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />

                {formErr && <div className="login-err">{formErr}</div>}

                <button className="btn-primary big" onClick={crearNegocio} disabled={creando}>
                  {creando ? "Creando…" : "Crear negocio"}
                </button>
              </>
            ) : (
              <>
                <p className="muted" style={{ marginBottom: 16, textAlign: "center" }}>
                  El negocio ya está activo con 14 días de prueba. Comparte este
                  link con tu cliente para que cree su cuenta:
                </p>

                {/* Link de registro */}
                <div style={{
                  background: "#f5f0e8", borderRadius: 10, padding: "10px 14px",
                  fontFamily: "monospace", fontSize: 12, wordBreak: "break-all",
                  marginBottom: 12, color: "#241B14"
                }}>
                  {linkGenerado}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-ghost" style={{ flex: 1 }} onClick={copiar}>
                    <Copy size={14} /> {copiado ? "Copiado" : "Copiar link"}
                  </button>
                  <a className="btn-ghost" style={{ flex: 1, textAlign: "center" }}
                    href={linkGenerado} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} /> Previsualizar
                  </a>
                </div>

                <p className="muted" style={{ marginTop: 14, fontSize: 12, textAlign: "center" }}>
                  Cuando el cliente confirme su correo, quedará vinculado a ese negocio automáticamente.
                </p>

                <button className="btn-primary big" style={{ marginTop: 12 }} onClick={cerrarModal}>
                  Listo
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
