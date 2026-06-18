"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Save, Crosshair, Eye } from "lucide-react";

export default function Configuracion() {
  const supabase = supabaseBrowser();
  const [negocio, setNegocio] = useState(null);
  const [form, setForm]       = useState({});
  const [busy, setBusy]       = useState(false);
  const [gps, setGps]         = useState(false);
  const [msg, setMsg]         = useState("");
  const [mapsUrl, setMapsUrl] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("negocios")
        .select("*").eq("owner_id", user.id).maybeSingle();
      if (data) { setNegocio(data); setForm(data); }
    })();
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function guardar() {
    setBusy(true);
    const { error } = await supabase.from("negocios").update({
      nombre:       form.nombre,
      ciudad:       form.ciudad,
      whatsapp:     form.whatsapp,
      horario:      form.horario,
      color:        form.color,
      logo_emoji:   form.logo_emoji,
      meta_sellos:  parseInt(form.meta_sellos) || 10,
      premio:       form.premio,
      lat:          form.lat  ? parseFloat(form.lat)  : null,
      lng:          form.lng  ? parseFloat(form.lng)  : null,
      radio_metros: parseInt(form.radio_metros) || 300,
    }).eq("id", negocio.id);
    setBusy(false);
    if (error) { setMsg("❌ " + error.message); return; }
    setMsg("✓ Cambios guardados");
    setTimeout(() => setMsg(""), 2500);
  }

  function usarGPS() {
    if (!navigator.geolocation) { alert("Tu navegador no tiene geolocalización"); return; }
    setGps(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { set("lat", p.coords.latitude.toFixed(7)); set("lng", p.coords.longitude.toFixed(7)); setGps(false); },
      ()  => { alert("No se pudo obtener la ubicación"); setGps(false); }
    );
  }

  function parsearMaps() {
    const m = mapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
              mapsUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) { set("lat", parseFloat(m[1]).toFixed(7)); set("lng", parseFloat(m[2]).toFixed(7)); }
    else alert("No encontré coordenadas en esa URL. Copia el link desde Google Maps → Compartir → Copiar enlace.");
  }

  if (!negocio) return <div className="loading">Cargando…</div>;

  return (
    <>
      <header className="ph">
        <h1>Configuración</h1>
        <a className="btn-ghost sm" href={`/i/${negocio.handle}/menu`} target="_blank" rel="noreferrer">
          <Eye size={14} /> Ver InfoLink
        </a>
      </header>

      {/* ── Identidad ── */}
      <div className="pcard">
        <h2 className="cfg-title">Identidad</h2>

        <div style={{ display:"flex", gap:12, alignItems:"flex-end" }}>
          <div>
            <label className="lbl">Emoji</label>
            <input className="inp" value={form.logo_emoji || ""} maxLength={2}
              style={{ width:64, fontSize:24, textAlign:"center" }}
              onChange={(e) => set("logo_emoji", e.target.value)} placeholder="☕" />
          </div>
          <div style={{ flex:1 }}>
            <label className="lbl">Nombre del negocio</label>
            <input className="inp" value={form.nombre || ""}
              onChange={(e) => set("nombre", e.target.value)} />
          </div>
        </div>

        <label className="lbl">Ciudad</label>
        <input className="inp" value={form.ciudad || ""}
          onChange={(e) => set("ciudad", e.target.value)} placeholder="Valledupar, CO" />

        <label className="lbl">WhatsApp (con código de país)</label>
        <input className="inp" value={form.whatsapp || ""}
          onChange={(e) => set("whatsapp", e.target.value)} placeholder="573001112233" />

        <label className="lbl">Color principal</label>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <input type="color" value={form.color || "#7A1B2E"}
            onChange={(e) => set("color", e.target.value)}
            style={{ width:48, height:44, border:"none", borderRadius:8, cursor:"pointer", padding:2 }} />
          <input className="inp" value={form.color || ""}
            onChange={(e) => set("color", e.target.value)} placeholder="#7A1B2E" />
        </div>
      </div>

      {/* ── Horarios ── */}
      <div className="pcard">
        <h2 className="cfg-title">Horarios</h2>
        <textarea className="inp" rows={4} value={form.horario || ""}
          onChange={(e) => set("horario", e.target.value)}
          placeholder={"Lunes a viernes: 7:00am – 8:00pm\nSábados: 8:00am – 6:00pm\nDomingos: cerrado"} />
      </div>

      {/* ── Programa de lealtad ── */}
      <div className="pcard">
        <h2 className="cfg-title">Programa de lealtad</h2>
        <div style={{ display:"flex", gap:12 }}>
          <div>
            <label className="lbl">Sellos para ganar</label>
            <input className="inp" type="number" min={1} max={50}
              value={form.meta_sellos || 10}
              onChange={(e) => set("meta_sellos", e.target.value)}
              style={{ width:80 }} />
          </div>
          <div style={{ flex:1 }}>
            <label className="lbl">Premio</label>
            <input className="inp" value={form.premio || ""}
              onChange={(e) => set("premio", e.target.value)}
              placeholder="1 café de especialidad gratis" />
          </div>
        </div>
      </div>

      {/* ── Ubicación para GeoPush ── */}
      <div className="pcard">
        <h2 className="cfg-title">Ubicación (para GeoPush)</h2>
        <p className="muted" style={{ marginBottom:12 }}>
          Con tu ubicación, el InfoLink detecta cuando un cliente está cerca y le muestra
          un banner de bienvenida automáticamente.
        </p>

        <button className="btn-ghost sm" onClick={usarGPS} disabled={gps} style={{ marginBottom:10 }}>
          <Crosshair size={15} /> {gps ? "Detectando…" : "Usar mi ubicación actual"}
        </button>

        <label className="lbl">O pega un link de Google Maps</label>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <input className="inp" value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            placeholder="https://maps.google.com/..." style={{ flex:1 }} />
          <button className="btn-ghost sm" onClick={parsearMaps}>Extraer</button>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <div style={{ flex:1 }}>
            <label className="lbl">Latitud</label>
            <input className="inp" value={form.lat || ""}
              onChange={(e) => set("lat", e.target.value)} placeholder="10.4634000" />
          </div>
          <div style={{ flex:1 }}>
            <label className="lbl">Longitud</label>
            <input className="inp" value={form.lng || ""}
              onChange={(e) => set("lng", e.target.value)} placeholder="-73.2532000" />
          </div>
        </div>

        <label className="lbl">Radio de detección (metros)</label>
        <input className="inp" type="number" min={50} max={2000}
          value={form.radio_metros || 300}
          onChange={(e) => set("radio_metros", e.target.value)}
          style={{ width:120 }} />
      </div>

      {msg && <div className={msg.startsWith("❌") ? "login-err" : "login-ok"} style={{ margin:"0 0 12px" }}>{msg}</div>}

      <button className="btn-primary big" onClick={guardar} disabled={busy} style={{ width:"100%" }}>
        <Save size={16} /> {busy ? "Guardando…" : "Guardar cambios"}
      </button>
    </>
  );
}
