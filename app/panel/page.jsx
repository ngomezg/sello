"use client";
import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { TrendingUp, Receipt, ShoppingBag, Stamp, Store, Users } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Cell, Tooltip } from "recharts";

const money = (n) => "$" + Number(n || 0).toLocaleString("es-CO");

// Presets de rango rápidos
const PRESETS = [
  { label: "Hoy",      dias: 0  },
  { label: "7 días",   dias: 7  },
  { label: "30 días",  dias: 30 },
  { label: "90 días",  dias: 90 },
];

function toISO(d) { return d.toISOString(); }

function rangoDesde(dias) {
  const hasta = new Date();
  const desde = new Date();
  if (dias === 0) {
    desde.setHours(0, 0, 0, 0);
  } else {
    desde.setDate(desde.getDate() - dias);
  }
  return { desde, hasta };
}

export default function Dashboard() {
  const supabase = supabaseBrowser();
  const [m, setM]             = useState(null);
  const [noNegocio, setNoNegocio] = useState(false);
  const [preset, setPreset]   = useState(1);           // índice en PRESETS (default: 7 días)
  const [custom, setCustom]   = useState(false);       // modo personalizado
  const [desde, setDesde]     = useState("");          // YYYY-MM-DD
  const [hasta, setHasta]     = useState("");
  const [form, setForm]       = useState({ handle:"", nombre:"", ciudad:"", whatsapp:"" });
  const [err, setErr]         = useState("");
  const [busy, setBusy]       = useState(false);

  const cargar = useCallback(async (p_desde, p_hasta) => {
    setM(null);
    const { data } = await supabase.rpc("panel_metricas_rango", {
      p_desde: toISO(p_desde),
      p_hasta: toISO(p_hasta),
    });
    if (data?.error === "sin negocio") { setNoNegocio(true); return; }
    setM(data);
  }, []);

  useEffect(() => {
    const { desde, hasta } = rangoDesde(PRESETS[preset].dias);
    cargar(desde, hasta);
  }, [cargar, preset]);

  function aplicarCustom() {
    if (!desde || !hasta) return;
    cargar(new Date(desde + "T00:00:00"), new Date(hasta + "T23:59:59"));
  }

  async function crearNegocio() {
    setErr(""); setBusy(true);
    try {
      const handle = form.handle.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
      if (!handle || !form.nombre.trim()) { setErr("Completa nombre e identificador."); setBusy(false); return; }
      const { data, error } = await supabase.rpc("crear_negocio_propio", {
        p_handle: handle, p_nombre: form.nombre,
        p_ciudad: form.ciudad || null, p_whatsapp: form.whatsapp || null,
      });
      if (error) throw error;
      if (data?.error) { setErr(data.error); setBusy(false); return; }
      const { desde, hasta } = rangoDesde(7);
      cargar(desde, hasta);
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (noNegocio) return (
    <div className="onboard">
      <Store size={28} className="onboard-ico" />
      <h2>Crea tu negocio</h2>
      <p>Esto solo se hace una vez. Tu link público quedará en <code>/i/tu-identificador/menu</code>.</p>
      <input className="inp" placeholder="Nombre del negocio" value={form.nombre}
        onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
      <input className="inp" placeholder="Identificador (ej: cafedelvalle)" value={form.handle}
        onChange={(e) => setForm({ ...form, handle: e.target.value })} />
      <input className="inp" placeholder="Ciudad (opcional)" value={form.ciudad}
        onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
      <input className="inp" placeholder="WhatsApp (opcional)" value={form.whatsapp}
        onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
      {err && <div className="login-err">{err}</div>}
      <button className="btn-primary big" onClick={crearNegocio} disabled={busy}>
        {busy ? "Creando…" : "Crear mi negocio"}
      </button>
    </div>
  );

  const maxV = Math.max(...(m?.chart || []).map((d) => d.v), 1);

  return (
    <>
      <header className="ph">
        <h1>Resumen</h1>
      </header>

      {/* Selector de rango */}
      <div className="rango-wrap">
        <div className="rango-presets">
          {PRESETS.map((p, i) => (
            <button key={i}
              className={"rango-btn " + (!custom && preset === i ? "on" : "")}
              onClick={() => { setPreset(i); setCustom(false); }}>
              {p.label}
            </button>
          ))}
          <button className={"rango-btn " + (custom ? "on" : "")}
            onClick={() => setCustom(true)}>
            Personalizado
          </button>
        </div>

        {custom && (
          <div className="rango-custom">
            <input className="inp slim" type="date" value={desde}
              onChange={(e) => setDesde(e.target.value)} />
            <span className="muted">→</span>
            <input className="inp slim" type="date" value={hasta}
              onChange={(e) => setHasta(e.target.value)} />
            <button className="btn-primary sm" onClick={aplicarCustom}
              disabled={!desde || !hasta}>
              Ver
            </button>
          </div>
        )}
      </div>

      {/* KPIs */}
      {!m ? (
        <div className="loading">Cargando métricas…</div>
      ) : (
        <>
          <div className="kpis">
            <Kpi icon={<TrendingUp size={15}/>} label="Ingresos"        value={money(m.ingresos)} />
            <Kpi icon={<Receipt size={15}/>}    label="Pedidos"         value={m.pedidos} />
            <Kpi icon={<ShoppingBag size={15}/>}label="Ticket prom."    value={money(m.ticket)} />
            <Kpi icon={<Stamp size={15}/>}      label="Sellos"          value={m.sellos} />
            <Kpi icon={<Users size={15}/>}      label="Clientes nuevos" value={m.clientes_nuevos} />
          </div>

          {/* Gráfico */}
          <div className="pcard">
            <h2 className="ph2">Ingresos por día</h2>
            {(m.chart || []).every(d => d.v === 0)
              ? <p className="muted">Sin pedidos en este período.</p>
              : (
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={m.chart} margin={{ top:8, right:0, left:0, bottom:0 }}>
                      <XAxis dataKey="d" tickLine={false} axisLine={false}
                        tick={{ fill:"#8a7a68", fontSize: m.chart.length > 20 ? 9 : 11 }}
                        interval={m.chart.length > 30 ? 6 : m.chart.length > 14 ? 2 : 0}
                      />
                      <Tooltip cursor={{ fill:"rgba(122,27,46,.06)" }}
                        contentStyle={{ borderRadius:12, border:"1px solid #ece0cc", fontSize:12 }}
                        formatter={(v) => [money(v), "Ingresos"]} />
                      <Bar dataKey="v" radius={[6,6,0,0]}>
                        {(m.chart || []).map((d,i) => (
                          <Cell key={i} fill={d.v === maxV ? "#7A1B2E" : "#d8b4a0"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          </div>

          {/* Top productos */}
          <div className="pcard">
            <h2 className="ph2">Más vendidos</h2>
            {(m.top || []).length === 0
              ? <p className="muted">Aún sin pedidos en este período.</p>
              : (m.top || []).map((t, i) => (
                <div className="topbar" key={i}>
                  <span className="rank">{i+1}</span>
                  <b>{t.n}</b>
                  <div className="topbar-track">
                    <span style={{ width:(t.q / m.top[0].q)*100+"%" }} />
                  </div>
                  <span className="topq">{t.q}</span>
                </div>
              ))
            }
          </div>
        </>
      )}
    </>
  );
}

function Kpi({ icon, label, value }) {
  return (
    <div className="kpi">
      <span className="kpi-ico">{icon}</span>
      <span className="kpi-label">{label}</span>
      <span className="kpi-val">{value}</span>
    </div>
  );
}
