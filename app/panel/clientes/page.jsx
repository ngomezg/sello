"use client";
import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { QRCodeCanvas } from "qrcode.react";
import { Stamp, Plus, X, Copy, Check } from "lucide-react";

export default function Clientes() {
  const [rows, setRows] = useState([]);
  const [negocio, setNegocio] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [nuevaUrl, setNuevaUrl] = useState(""); // url con el token para entregar al cliente
  const [copiado, setCopiado] = useState(false);
  const supabase = supabaseBrowser();

  const cargar = useCallback(async () => {
    // Trae también el token: lo necesitamos para poder regenerar el QR de entrega.
    const { data } = await supabase
      .from("tarjetas")
      .select("token,sellos,premios_ganados,ultima_visita,clientes(nombre,telefono)")
      .order("ultima_visita", { ascending: false }).limit(100);
    setRows(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: n } = await supabase.from("negocios")
        .select("id,handle").eq("owner_id", user.id).maybeSingle();
      setNegocio(n || null);
      cargar();
    })();
  }, [cargar]);

  async function crearCliente() {
    if (!negocio) return;
    if (!form.nombre.trim()) { setErr("Ponle al menos un nombre."); return; }
    setErr(""); setBusy(true);
    try {
      const { data: cliente, error: e1 } = await supabase
        .from("clientes")
        .insert({
          negocio_id: negocio.id,
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim() || null,
          email: form.email.trim() || null,
        })
        .select().single();
      if (e1) throw e1;

      const { data: tarjeta, error: e2 } = await supabase
        .from("tarjetas")
        .insert({ cliente_id: cliente.id, negocio_id: negocio.id })
        .select().single();
      if (e2) throw e2;

      // URL que el cliente escanea con la cámara de su teléfono para
      // que su navegador adopte ESTA tarjeta como suya (ver InfoLink.jsx).
      const url = `${window.location.origin}/i/${negocio.handle}/menu?t=${tarjeta.token}`;
      setNuevaUrl(url);
      setForm({ nombre: "", telefono: "", email: "" });
      cargar();
    } catch (e) {
      setErr(e.message || "No se pudo crear el cliente");
    } finally {
      setBusy(false);
    }
  }

  function copiar() {
    navigator.clipboard.writeText(nuevaUrl).then(() => {
      setCopiado(true); setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <>
      <header className="ph">
        <h1>Clientes</h1>
        <button className="btn-primary sm" onClick={() => { setShowForm(true); setNuevaUrl(""); setErr(""); }}>
          <Plus size={15} /> Nuevo cliente
        </button>
      </header>

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
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                <label className="lbl">Teléfono (opcional)</label>
                <input className="inp" value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                <label className="lbl">Correo (opcional)</label>
                <input className="inp" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {err && <div className="login-err">{err}</div>}
                <button className="btn-primary big" onClick={crearCliente} disabled={busy}>
                  {busy ? "Creando…" : "Crear cliente y tarjeta"}
                </button>
              </>
            ) : (
              <>
                <p className="muted" style={{ textAlign: "center", marginBottom: 12 }}>
                  Pídele al cliente que escanee este QR con la cámara de su teléfono:
                  abrirá su InfoLink con la tarjeta ya lista.
                </p>
                <div className="qr-frame">
                  <QRCodeCanvas value={nuevaUrl} size={188} bgColor="#FFFDF8" fgColor="#241B14" level="M" includeMargin />
                </div>
                <button className="btn-ghost" style={{ width: "100%", marginTop: 12 }} onClick={copiar}>
                  {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? "Copiado" : "Copiar enlace"}
                </button>
                <button className="btn-primary big" style={{ marginTop: 10 }}
                  onClick={() => { setNuevaUrl(""); setShowForm(false); }}>
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
