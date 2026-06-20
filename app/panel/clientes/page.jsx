"use client";
import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { QRCodeCanvas } from "qrcode.react";
import { Stamp, Plus, X, Copy, Check, Pencil, Clock, ChevronRight, Download } from "lucide-react";

const fecha = (d) => d ? new Date(d).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const hora  = (d) => d ? new Date(d).toLocaleTimeString("es-CO", { hour:"2-digit", minute:"2-digit" }) : "";

export default function Clientes() {
  const supabase = supabaseBrowser();
  const [negocio, setNegocio]   = useState(null);
  const [rows, setRows]         = useState([]);
  const [detalle, setDetalle]   = useState(null);   // tarjeta seleccionada
  const [tab, setTab]           = useState("datos"); // "datos" | "historial"
  const [historial, setHistorial] = useState([]);
  const [editForm, setEditForm] = useState({});
  const [busy, setBusy]         = useState(false);
  const [msg, setMsg]           = useState("");

  // Nuevo cliente
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ nombre:"", telefono:"", email:"" });
  const [nuevaUrl, setNuevaUrl] = useState("");
  const [copiado, setCopiado]   = useState(false);
  const [err, setErr]           = useState("");

  const toast = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2500); };

  const cargar = useCallback(async (nid) => {
    const { data } = await supabase
      .from("tarjetas")
      .select("id,token,sellos,premios_ganados,ultima_visita,clientes(id,nombre,telefono,email,cumple)")
      .eq("negocio_id", nid)
      .order("ultima_visita", { ascending: false })
      .limit(100);
    setRows(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: n } = await supabase.from("negocios")
        .select("id,handle").eq("owner_id", user.id).maybeSingle();
      if (!n) return;
      setNegocio(n);
      cargar(n.id);
    })();
  }, [cargar]);

  // Abre el detalle de un cliente
  async function abrirDetalle(r) {
    setDetalle(r);
    setTab("datos");
    setEditForm({
      nombre:   r.clientes?.nombre   || "",
      telefono: r.clientes?.telefono || "",
      email:    r.clientes?.email    || "",
      cumple:   r.clientes?.cumple   || "",
    });
    // Carga el historial de sellos de esa tarjeta
    const { data } = await supabase
      .from("sellos_log")
      .select("cantidad,origen,created_at")
      .eq("tarjeta_id", r.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setHistorial(data || []);
  }

  // Guarda los datos editados del cliente
  async function guardarCliente() {
    if (!detalle?.clientes?.id) return;
    setBusy(true);
    const { error } = await supabase.from("clientes").update({
      nombre:   editForm.nombre.trim()   || null,
      telefono: editForm.telefono.trim() || null,
      email:    editForm.email.trim()    || null,
      cumple:   editForm.cumple          || null,
    }).eq("id", detalle.clientes.id);
    setBusy(false);
    if (error) toast("Error: " + error.message);
    else { toast("Guardado"); cargar(negocio.id); setDetalle(null); }
  }

  // Crear nuevo cliente
  async function crearCliente() {
    if (!negocio || !form.nombre.trim()) { setErr("Ponle al menos un nombre."); return; }
    setErr(""); setBusy(true);
    try {
      const { data: c, error: e1 } = await supabase.from("clientes")
        .insert({ negocio_id: negocio.id, nombre: form.nombre.trim(),
          telefono: form.telefono.trim() || null, email: form.email.trim() || null })
        .select().single();
      if (e1) throw e1;
      const { data: t, error: e2 } = await supabase.from("tarjetas")
        .insert({ cliente_id: c.id, negocio_id: negocio.id }).select().single();
      if (e2) throw e2;
      setNuevaUrl(`${window.location.origin}/i/${negocio.handle}/menu?t=${t.token}`);
      setForm({ nombre:"", telefono:"", email:"" });
      cargar(negocio.id);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  function copiar() {
    navigator.clipboard.writeText(nuevaUrl).then(() => {
      setCopiado(true); setTimeout(() => setCopiado(false), 2000);
    });
  }

  const origenLabel = (o) => ({ manual:"Sellado manual", pedido:"Pedido", qr:"QR" }[o] || o || "—");

  // Exporta todos los clientes como CSV descargable.
  // Se genera en el cliente con los datos ya cargados — sin llamada extra a la API.
  function exportarCSV() {
    const encabezado = ["Nombre","Teléfono","Email","Cumpleaños","Sellos","Premios","Última visita"];
    const filas = rows.map((r) => [
      r.clientes?.nombre    || "Invitado",
      r.clientes?.telefono  || "",
      r.clientes?.email     || "",
      r.clientes?.cumple    || "",
      r.sellos,
      r.premios_ganados,
      r.ultima_visita ? new Date(r.ultima_visita).toLocaleDateString("es-CO") : "",
    ]);
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `clientes-${negocio?.handle || "sello"}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`${rows.length} clientes exportados`);
  }

  return (
    <>
      <header className="ph">
        <h1>Clientes</h1>
        <div style={{ display:"flex", gap:8 }}>
          {rows.length > 0 && (
            <button className="btn-ghost sm" onClick={exportarCSV} title="Exportar a CSV">
              <Download size={15} /> CSV
            </button>
          )}
          <button className="btn-primary sm"
            onClick={() => { setShowForm(true); setNuevaUrl(""); setErr(""); }}>
            <Plus size={15} /> Nuevo cliente
          </button>
        </div>
      </header>

      {/* Lista de clientes */}
      <div className="pcard">
        {rows.length === 0 && <p className="muted">Aún no hay clientes con tarjeta.</p>}
        {rows.map((r) => (
          <div className="crm crm-click" key={r.id} onClick={() => abrirDetalle(r)}>
            <div className="crm-av">{(r.clientes?.nombre || "I")[0].toUpperCase()}</div>
            <div className="crm-info">
              <b>{r.clientes?.nombre || "Invitado"}</b>
              <small>
                {r.premios_ganados > 0 && `${r.premios_ganados} premio(s) · `}
                {r.ultima_visita ? "Última visita: " + fecha(r.ultima_visita) : "Sin visitas"}
              </small>
            </div>
            <div className="crm-seals">{r.sellos} <Stamp size={12} /></div>
            <ChevronRight size={16} style={{ color:"var(--ink2)", flexShrink:0 }} />
          </div>
        ))}
      </div>

      {/* Panel de detalle: Datos + Historial */}
      {detalle && (
        <div className="sheet-bg" onClick={(e) => e.target.classList.contains("sheet-bg") && setDetalle(null)}>
          <div className="sheet sheet-tall">
            <div className="sheet-head">
              <b>{detalle.clientes?.nombre || "Invitado"}</b>
              <button onClick={() => setDetalle(null)}><X size={18} /></button>
            </div>

            {/* Resumen rápido */}
            <div className="crm-summary">
              <div className="crm-stat">
                <span>{detalle.sellos}</span><small>sellos</small>
              </div>
              <div className="crm-stat">
                <span>{detalle.premios_ganados}</span><small>premios</small>
              </div>
              <div className="crm-stat">
                <span>{historial.length}</span><small>visitas</small>
              </div>
            </div>

            {/* Tabs */}
            <div className="crm-tabs">
              <button className={"crm-tab " + (tab==="datos"?"on":"")} onClick={() => setTab("datos")}>
                <Pencil size={14} /> Datos
              </button>
              <button className={"crm-tab " + (tab==="historial"?"on":"")} onClick={() => setTab("historial")}>
                <Clock size={14} /> Historial
              </button>
            </div>

            {/* Tab: Datos */}
            {tab === "datos" && (
              <div className="crm-tab-body">
                <label className="lbl">Nombre</label>
                <input className="inp" value={editForm.nombre}
                  onChange={(e) => setEditForm({...editForm, nombre: e.target.value})} />
                <label className="lbl">Teléfono</label>
                <input className="inp" placeholder="573001112233" value={editForm.telefono}
                  onChange={(e) => setEditForm({...editForm, telefono: e.target.value})} />
                <label className="lbl">Correo</label>
                <input className="inp" type="email" value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
                <label className="lbl">Fecha de cumpleaños</label>
                <input className="inp" type="date" value={editForm.cumple}
                  onChange={(e) => setEditForm({...editForm, cumple: e.target.value})} />
                <button className="btn-primary big" onClick={guardarCliente} disabled={busy}>
                  <Check size={15} /> {busy ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            )}

            {/* Tab: Historial de sellos */}
            {tab === "historial" && (
              <div className="crm-tab-body">
                {historial.length === 0
                  ? <p className="muted">Aún no hay sellos registrados.</p>
                  : historial.map((h, i) => (
                    <div className="hist-row" key={i}>
                      <div className="hist-dot">
                        <Stamp size={13} />
                      </div>
                      <div className="hist-info">
                        <b>+{h.cantidad} sello{h.cantidad !== 1 ? "s" : ""}</b>
                        <small>{origenLabel(h.origen)} · {fecha(h.created_at)} {hora(h.created_at)}</small>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sheet: nuevo cliente */}
      {showForm && (
        <div className="sheet-bg" onClick={(e) => e.target.classList.contains("sheet-bg") && setShowForm(false)}>
          <div className="sheet">
            <div className="sheet-head">
              <b>{nuevaUrl ? "Tarjeta creada" : "Nuevo cliente"}</b>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            {!nuevaUrl ? (
              <>
                <label className="lbl">Nombre</label>
                <input className="inp" value={form.nombre}
                  onChange={(e) => setForm({...form, nombre: e.target.value})} />
                <label className="lbl">Teléfono (opcional)</label>
                <input className="inp" value={form.telefono}
                  onChange={(e) => setForm({...form, telefono: e.target.value})} />
                <label className="lbl">Correo (opcional)</label>
                <input className="inp" value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})} />
                {err && <div className="login-err">{err}</div>}
                <button className="btn-primary big" onClick={crearCliente} disabled={busy}>
                  {busy ? "Creando…" : "Crear cliente y tarjeta"}
                </button>
              </>
            ) : (
              <>
                <p className="muted" style={{ textAlign:"center", marginBottom:12 }}>
                  El cliente escanea este QR para activar su tarjeta.
                </p>
                <div className="qr-frame">
                  <QRCodeCanvas value={nuevaUrl} size={188} bgColor="#FFFDF8" fgColor="#241B14" level="M" includeMargin />
                </div>
                <button className="btn-ghost" style={{ width:"100%", marginTop:12 }} onClick={copiar}>
                  {copiado ? <Check size={16}/> : <Copy size={16}/>} {copiado ? "Copiado" : "Copiar enlace"}
                </button>
                <button className="btn-primary big" style={{ marginTop:10 }}
                  onClick={() => { setNuevaUrl(""); setShowForm(false); }}>
                  Listo
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {msg && <div className="toast">{msg}</div>}
    </>
  );
}
