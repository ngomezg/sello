"use client";
import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { QRCodeCanvas } from "qrcode.react";
import { Check, Pause, Clock, Plus, X, Copy, ExternalLink, QrCode, Printer } from "lucide-react";

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
  const [negocios, setNegocios]     = useState(null);
  const [autorizado, setAutorizado] = useState(true);
  const [periodos, setPeriodos]     = useState({});
  const [busy, setBusy]             = useState("");

  // Modal crear negocio
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(FORM_VACIO);
  const [formErr, setFormErr]       = useState("");
  const [creando, setCreando]       = useState(false);
  const [linkGenerado, setLinkGenerado] = useState("");
  const [copiado, setCopiado]       = useState(false);

  // Modal Ver QR
  const [qrNegocio, setQrNegocio]   = useState(null); // { handle, nombre, logo_emoji, color }

  const supabase = supabaseBrowser();
  const origin   = typeof window !== "undefined" ? window.location.origin : "https://sello-tau.vercel.app";

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc("admin_listar_negocios");
    if (data?.error === "no autorizado") { setAutorizado(false); return; }
    setNegocios(data?.negocios || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function getPeriodo(handle) { return periodos[handle] || { cantidad: 1, unidad: "meses" }; }
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
      setFormErr("El nombre y el identificador son obligatorios."); setCreando(false); return;
    }
    const { data } = await supabase.rpc("admin_crear_negocio", {
      p_handle: handle, p_nombre: form.nombre.trim(),
      p_ciudad: form.ciudad.trim() || null, p_whatsapp: form.whatsapp.trim() || null,
    });
    setCreando(false);
    if (data?.error) { setFormErr(data.error); return; }
    setLinkGenerado(`${origin}/registro?negocio=${handle}`);
    setForm(FORM_VACIO); await cargar();
  }

  function copiar(txt) {
    navigator.clipboard.writeText(txt).then(() => {
      setCopiado(true); setTimeout(() => setCopiado(false), 2000);
    });
  }

  function cerrarModal() {
    setShowModal(false); setForm(FORM_VACIO);
    setFormErr(""); setLinkGenerado(""); setCopiado(false);
  }

  // Imprime solo el QR (abre ventana aparte)
  function imprimirQR(n) {
    const url  = `${origin}/i/${n.handle}/menu`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>QR ${n.nombre}</title>
      <style>
        body{margin:0;font-family:sans-serif;display:flex;flex-direction:column;
          align-items:center;justify-content:center;min-height:100vh;background:#fff}
        .top{background:${n.color||"#7A1B2E"};width:100%;padding:28px;text-align:center;color:#fff}
        h1{margin:0;font-size:28px} p{margin:4px 0;font-size:14px;opacity:.85}
        .qr{margin:32px auto;padding:16px;border:3px solid #1a1008;border-radius:12px;
          display:inline-block}
        .qr img{display:block}
        .foot{font-size:11px;color:#888;margin-top:24px}
      </style>
    </head><body>
      <div class="top">
        <div style="font-size:48px">${n.logo_emoji||"🏪"}</div>
        <h1>${n.nombre}</h1>
        <p>${n.ciudad||""}</p>
      </div>
      <div class="qr">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}" width="240" height="240">
      </div>
      <p style="font-size:16px;font-weight:bold">Escanea y acumula sellos</p>
      <p class="foot">${url}</p>
      <script>window.onload=()=>{window.print();}</script>
    </body></html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  }

  if (!autorizado) return (
    <div className="onboard"><h2>Sección solo para el administrador</h2></div>
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
      </p>

      {negocios.length === 0 && <p className="muted">Aún no hay negocios. Crea el primero.</p>}

      {negocios.map((n) => {
        const est   = ESTADO_LABEL[n.estado] || { t: n.estado, c: "" };
        const vence = n.vence_at ? new Date(n.vence_at).toLocaleDateString("es-CO") : "—";
        const { cantidad, unidad } = getPeriodo(n.handle);
        const infoUrl = `${origin}/i/${n.handle}/menu`;

        return (
          <div className="pago-row" key={n.handle}>
            <div className="pago-info">
              <b>{n.nombre}</b>
              <small>/{n.handle} · {n.ciudad || "sin ciudad"} · {n.correo || "sin dueño aún"}</small>
            </div>

            <span className={"pago-badge " + est.c}>{est.t}</span>
            <span className="pago-vence"><Clock size={12} /> {vence}</span>

            {/* Período de pago */}
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

            <button className="btn-mini ok" disabled={busy === n.handle}
              onClick={() => confirmarPago(n.handle)}>
              <Check size={13} /> Confirmar
            </button>
            <button className="btn-mini bad" disabled={busy === n.handle}
              onClick={() => suspender(n.handle)}>
              <Pause size={13} /> Suspender
            </button>

            {/* Ver QR del negocio */}
            <button className="btn-mini qr" onClick={() => setQrNegocio(n)}
              title="Ver QR para el mostrador">
              <QrCode size={13} /> QR
            </button>
          </div>
        );
      })}

      {/* ── Modal: Ver QR de un negocio ── */}
      {qrNegocio && (
        <div className="sheet-bg" onClick={(e) => e.target.classList.contains("sheet-bg") && setQrNegocio(null)}>
          <div className="sheet">
            <div className="sheet-head">
              <b>QR de {qrNegocio.nombre}</b>
              <button onClick={() => setQrNegocio(null)}><X size={18} /></button>
            </div>

            {/* Mini tarjeta del negocio */}
            <div className="qr-admin-card" style={{ "--c": qrNegocio.color || "#7A1B2E" }}>
              <span style={{ fontSize: 32 }}>{qrNegocio.logo_emoji || "🏪"}</span>
              <div>
                <b>{qrNegocio.nombre}</b>
                <small>{qrNegocio.ciudad || ""}</small>
              </div>
            </div>

            {/* QR grande */}
            <div className="qr-frame" style={{ margin: "16px auto" }}>
              <QRCodeCanvas
                value={`${origin}/i/${qrNegocio.handle}/menu`}
                size={200}
                bgColor="#FFFDF8"
                fgColor="#241B14"
                level="M"
                includeMargin
              />
            </div>

            <p className="muted" style={{ textAlign: "center", fontSize: 11, marginBottom: 12 }}>
              {origin}/i/{qrNegocio.handle}/menu
            </p>

            {/* Acciones */}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" style={{ flex: 1 }}
                onClick={() => copiar(`${origin}/i/${qrNegocio.handle}/menu`)}>
                <Copy size={14} /> {copiado ? "Copiado" : "Copiar link"}
              </button>
              <a className="btn-ghost" style={{ flex: 1, textAlign: "center" }}
                href={`${origin}/i/${qrNegocio.handle}/menu`} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> Ver InfoLink
              </a>
            </div>

            <button className="btn-primary big" style={{ marginTop: 10 }}
              onClick={() => imprimirQR(qrNegocio)}>
              <Printer size={15} /> Imprimir QR
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Crear negocio ── */}
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
                  Crea el negocio y comparte el link de registro con tu cliente.
                </p>
                <label className="lbl">Nombre del negocio</label>
                <input className="inp" placeholder="Spa Zen" value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                <label className="lbl">Identificador para la URL</label>
                <input className="inp" placeholder="spazen" value={form.handle}
                  onChange={(e) => setForm({ ...form, handle: e.target.value })} />
                <small className="muted" style={{ marginBottom: 8, display: "block" }}>
                  Quedará en: /i/<b>{form.handle || "identificador"}</b>/menu
                </small>
                <label className="lbl">Ciudad (opcional)</label>
                <input className="inp" placeholder="Bogotá, CO" value={form.ciudad}
                  onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
                <label className="lbl">WhatsApp (opcional)</label>
                <input className="inp" placeholder="573001112233" value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                {formErr && <div className="login-err">{formErr}</div>}
                <button className="btn-primary big" onClick={crearNegocio} disabled={creando}>
                  {creando ? "Creando…" : "Crear negocio"}
                </button>
              </>
            ) : (
              <>
                <p className="muted" style={{ marginBottom: 12, textAlign: "center" }}>
                  Comparte este link con tu cliente para que cree su cuenta:
                </p>
                <div className="cfg-link-row" style={{ marginBottom: 12 }}>
                  <span className="cfg-link-url">{linkGenerado}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-ghost" style={{ flex: 1 }} onClick={() => copiar(linkGenerado)}>
                    <Copy size={14} /> {copiado ? "Copiado" : "Copiar"}
                  </button>
                  <a className="btn-ghost" style={{ flex: 1, textAlign: "center" }}
                    href={linkGenerado} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} /> Abrir
                  </a>
                </div>
                <button className="btn-primary big" style={{ marginTop: 10 }} onClick={cerrarModal}>
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
