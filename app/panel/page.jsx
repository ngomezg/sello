"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { TrendingUp, Receipt, ShoppingBag, Stamp } from "lucide-react";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, Cell, Tooltip,
} from "recharts";

const money = (n) => "$" + Number(n || 0).toLocaleString("es-CO");

export default function Dashboard() {
  const [m, setM] = useState(null);
  const [noNegocio, setNoNegocio] = useState(false);
  const supabase = supabaseBrowser();

  async function cargar() {
    const { data, error } = await supabase.rpc("panel_metricas");
    if (error) return;
    if (data?.error === "sin negocio") { setNoNegocio(true); return; }
    setM(data); setNoNegocio(false);
  }
  useEffect(() => { cargar(); }, []);

  async function reclamar() {
    await supabase.rpc("reclamar_negocio", { p_handle: "cafedelvalle" });
    cargar();
  }

  if (noNegocio) {
    return (
      <div className="empty-claim">
        <h2>Conecta tu negocio</h2>
        <p>Tu cuenta aún no está ligada a un negocio. Para la demo, reclama Café del Valle.</p>
        <button className="btn-primary" onClick={reclamar}>Reclamar Café del Valle</button>
      </div>
    );
  }
  if (!m) return <div className="loading">Cargando métricas…</div>;

  const maxV = Math.max(...(m.revenue7d || []).map((d) => d.v), 1);

  return (
    <>
      <header className="ph"><h1>Resumen</h1><span className="ph-sub">Últimos 7 días</span></header>

      <div className="kpis">
        <Kpi icon={<TrendingUp size={15} />} label="Ingresos 7d" value={money(m.ingresos7d)} />
        <Kpi icon={<Receipt size={15} />} label="Pedidos" value={m.pedidos7d} />
        <Kpi icon={<ShoppingBag size={15} />} label="Ticket prom." value={money(m.ticket)} />
        <Kpi icon={<Stamp size={15} />} label="Sellos" value={m.sellos7d} />
      </div>

      <div className="pcard">
        <h2 className="ph2">Ingresos por día</h2>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={m.revenue7d} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fill: "#8a7a68", fontSize: 11 }} />
              <Tooltip cursor={{ fill: "rgba(122,27,46,.06)" }}
                contentStyle={{ borderRadius: 12, border: "1px solid #ece0cc", fontSize: 12 }}
                formatter={(v) => [money(v), "Ingresos"]} />
              <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                {(m.revenue7d || []).map((d, i) => (
                  <Cell key={i} fill={d.v === maxV ? "#7A1B2E" : "#d8b4a0"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="pcard">
        <h2 className="ph2">Más vendidos</h2>
        {(m.top || []).length === 0 && <p className="muted">Aún sin pedidos. Genera uno desde el InfoLink.</p>}
        {(m.top || []).map((t, i) => (
          <div className="topbar" key={i}>
            <span className="rank">{i + 1}</span>
            <b>{t.n}</b>
            <div className="topbar-track"><span style={{ width: (t.q / m.top[0].q) * 100 + "%" }} /></div>
            <span className="topq">{t.q}</span>
          </div>
        ))}
      </div>
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
