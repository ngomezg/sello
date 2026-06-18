"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Save, MapPin, ExternalLink, Copy, Check, Navigation } from "lucide-react";

export default function Config() {
  const supabase = supabaseBrowser();
  const [negocio, setNegocio] = useState(null);
  const [form, setForm]       = useState(null);
  const [busy, setBusy]       = useState(false);
  const [msg, setMsg]         = useState("");
  const [copiado, setCopiado] = useState(false);
  const [mapsUrl, setMapsUrl] = useState("");

  const toast = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2500); };
  const set   = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: n } = await supabase.from("negocios")
        .select("*").eq("owner_id", user.id).maybeSingle();
      if (!n) return;
      setNegocio(n);
      setForm({
        nombre:       n.nombre       || "",
        ciudad:       n.ciudad       || "",
        whatsapp:     n.whatsapp     || "",
        logo_emoji:   n.logo_emoji   || "☕",
        color:        n.color        || "#7A1B2E",
        meta_sellos:  n.meta_sellos  || 10,
        premio:       n.premio       || "",
        horario:      n.horario      || "",
        lat:          n.lat          || "",
        lng:          n.lng          || "",
        radio_metros: n.radio_metros || 300,
      });
    })();
  }, []);

  async function guardar() {
    if (!negocio || !form) return;
    setBusy(true);
    const { error } = await supabase.from("negocios").update({
      nombre:       form.nombre.trim(),
      ciudad:       form.ciudad.trim()    || null,
      whatsapp:     form.whatsapp.trim()  || null,
      logo_emoji:   form.logo_emoji.trim()|| "☕",
      color:        form.color,
      meta_sellos:  parseInt(form.meta_sellos, 10) || 10,
      premio:       form.premio.trim()    || null,
      horario:      form.horario.trim()   || null,
      lat:          form.lat  ? parseFloat(form.lat)  : null,
      lng:          form.lng  ? parseFloat(form.lng)  : null,
      radio_metros: parseInt(form.radio_metros, 10) || 300,
    }).eq("id", negocio.id);
    setBusy(false);
    if (error) toast("Error: " + error.message);
    else       toast("¡Guardado correctamente!");
  }

  // Extrae lat/lng de una URL de Google Maps pegada por el usuario.
  // Soporta: google.com/maps/@lat,lng y google.com/maps/place/.../data=...!3dlat!4dlng
  function parsearMaps(url) {
    let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) return { lat: m[1], lng: m[2] };
    m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (m) return { lat: m[1], lng: m[2] };
    m = url.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) return { lat: m[1], lng: m[2] };
    return null;
  }

  function aplicarMapsUrl() {
    const coords = parsearMaps(mapsUrl);
    if (!coords) { toast("No se pudieron extraer las coordenadas. Intenta con el link largo de Google Maps."); return; }
    set("lat", coords.lat); set("lng", coords.lng);
    setMapsUrl("");
    toast("Coordenadas extraídas correctamente");
  }

  function copiarLink() {
    const url = `${window.location.origin}/i/${negocio.handle}/menu`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true); setTimeout(() => setCopiado(false), 2000);
    });
  }

  if (!form) return <div className="loading">Cargando configuración…</div>;

  const infolink = `${typeof window !== "undefined" ? window.location.origin : ""}/i/${negocio?.handle}/menu`;

  return (
    <>
      <header className="ph">
        <h1>Configuración</h1>
        <button className="btn-primary sm" onClick={guardar} disabled={busy}>
          <Save size={15} /> {busy ? "Guardando…" : "Guardar cambios"}
        </button>
      </header>

      {/* ── Tu InfoLink ── */}
      <div className="cfg-section">
        <h2 className="cfg-title">Tu InfoLink público</h2>
        <div className="cfg-link-row">
          <span className="cfg-link-url">{infolink}</span>
          <button className="btn-ghost sm" onClick={copiarLink}>
            {copiado ? <Check size={14} /> : <Copy size={14} />}
            {copiado ? "Copiado" : "Copiar"}
          </button>
          <a className="btn-ghost sm" href={infolink} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Ver
          </a>
        </div>
      </div>

      {/* ── Info del negocio ── */}
      <div className="cfg-section">
        <h2 className="cfg-title">Información del negocio</h2>
        <div className="cfg-grid">
          <div>
            <label className="lbl">Nombre</label>
            <input className="inp" value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)} />
          </div>
          <div>
            <label className="lbl">Ciudad</label>
            <input className="inp" placeholder="Bogotá, CO" value={form.ciudad}
              onChange={(e) => set("ciudad", e.target.value)} />
          </div>
          <div>
            <label className="lbl">WhatsApp (con código de país)</label>
            <input className="inp" placeholder="573001112233" value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)} />
          </div>
          <div>
            <label className="lbl">Emoji del negocio</label>
            <input className="inp" maxLength={2} value={form.logo_emoji}
              onChange={(e) => set("logo_emoji", e.target.value)} />
          </div>
        </div>

        {/* Color con vista previa */}
        <label className="lbl" style={{ marginTop: 8 }}>Color del negocio</label>
        <div className="cfg-color-row">
          <input type="color" className="color-pick" value={form.color}
            onChange={(e) => set("color", e.target.value)} />
          <div className="color-preview" style={{ background: form.color }}>
            <span>{form.logo_emoji}</span>
            <b style={{ color: "#fff" }}>{form.nombre || "Tu negocio"}</b>
          </div>
        </div>

        <label className="lbl" style={{ marginTop: 8 }}>Horarios de atención</label>
        <textarea className="inp" rows={3}
          placeholder={"Lunes a viernes: 8:00am – 6:00pm\nSábados: 9:00am – 2:00pm"}
          value={form.horario}
          onChange={(e) => set("horario", e.target.value)} />
      </div>

      {/* ── Programa de fidelidad ── */}
      <div className="cfg-section">
        <h2 className="cfg-title">Programa de sellos</h2>
        <div className="cfg-grid">
          <div>
            <label className="lbl">Sellos para ganar el premio</label>
            <input className="inp" type="number" min={1} max={50} value={form.meta_sellos}
              onChange={(e) => set("meta_sellos", e.target.value)} />
          </div>
          <div>
            <label className="lbl">¿Qué gana el cliente?</label>
            <input className="inp" placeholder="1 café de especialidad gratis" value={form.premio}
              onChange={(e) => set("premio", e.target.value)} />
          </div>
        </div>
        {/* Vista previa de la tarjeta */}
        <div className="sello-preview" style={{ "--c": form.color }}>
          {Array.from({ length: form.meta_sellos || 10 }).map((_, i) => (
            <div key={i} className={"sp-dot " + (i < 3 ? "sp-on" : "sp-off")} />
          ))}
          <p className="sp-label">Al completar: <b>{form.premio || "tu premio"}</b></p>
        </div>
      </div>

      {/* ── Ubicación para GeoPush ── */}
      <div className="cfg-section">
        <h2 className="cfg-title">Ubicación <span className="cfg-badge">GeoPush</span></h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Necesaria para que el cliente vea el banner "¡Estás cerca!" cuando abre el InfoLink.
          Abre tu negocio en Google Maps, copia el URL y pégalo aquí:
        </p>
        <div className="cfg-maps-row">
          <input className="inp" placeholder="Pega la URL de Google Maps aquí…"
            value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} />
          <button className="btn-primary sm" onClick={aplicarMapsUrl} disabled={!mapsUrl}>
            <Navigation size={14} /> Extraer
          </button>
        </div>
        <div className="cfg-grid" style={{ marginTop: 8 }}>
          <div>
            <label className="lbl">Latitud</label>
            <input className="inp" type="number" step="any" placeholder="4.7110"
              value={form.lat} onChange={(e) => set("lat", e.target.value)} />
          </div>
          <div>
            <label className="lbl">Longitud</label>
            <input className="inp" type="number" step="any" placeholder="-74.0721"
              value={form.lng} onChange={(e) => set("lng", e.target.value)} />
          </div>
          <div>
            <label className="lbl">Radio de proximidad (metros)</label>
            <input className="inp" type="number" min={50} max={2000} value={form.radio_metros}
              onChange={(e) => set("radio_metros", e.target.value)} />
          </div>
        </div>
        {form.lat && form.lng && (
          <a className="btn-ghost sm" style={{ marginTop: 8, display: "inline-flex" }}
            href={`https://www.google.com/maps/@${form.lat},${form.lng},17z`}
            target="_blank" rel="noreferrer">
            <MapPin size={14} /> Verificar en Google Maps
          </a>
        )}
      </div>

      {msg && <div className="toast">{msg}</div>}
    </>
  );
}
