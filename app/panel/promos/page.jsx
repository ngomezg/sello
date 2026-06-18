"use client";
import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Check } from "lucide-react";

const VACIO = { emoji: "🎟️", titulo: "", detalle: "", activo: true };

export default function Promos() {
  const supabase = supabaseBrowser();
  const [negocio, setNegocio]   = useState(null);
  const [promos, setPromos]     = useState([]);
  const [editPromo, setEditPromo] = useState(null);
  const [busy, setBusy]         = useState(false);
  const [msg, setMsg]           = useState("");

  const toast = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2500); };

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: n } = await supabase.from("negocios")
      .select("id,handle").eq("owner_id", user.id).maybeSingle();
    if (!n) return;
    setNegocio(n);
    const { data } = await supabase.from("promos")
      .select("*").eq("negocio_id", n.id).order("created_at");
    setPromos(data || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardar() {
    if (!editPromo.titulo.trim()) { toast("Falta el título"); return; }
    setBusy(true);
    const payload = {
      emoji:   editPromo.emoji   || "🎟️",
      titulo:  editPromo.titulo.trim(),
      detalle: editPromo.detalle?.trim() || null,
    };
    if (editPromo.id) {
      await supabase.from("promos").update(payload).eq("id", editPromo.id);
    } else {
      await supabase.from("promos").insert({ ...payload, negocio_id: negocio.id });
    }
    setBusy(false); setEditPromo(null); toast("Promo guardada"); cargar();
  }

  async function toggle(p) {
    await supabase.from("promos").update({ activo: !p.activo }).eq("id", p.id);
    cargar();
  }

  async function eliminar(p) {
    if (!confirm(`¿Eliminar "${p.titulo}"?`)) return;
    await supabase.from("promos").delete().eq("id", p.id);
    toast("Promo eliminada"); cargar();
  }

  return (
    <>
      <header className="ph">
        <h1>Promos</h1>
        <button className="btn-primary sm" onClick={() => setEditPromo({ ...VACIO })}>
          <Plus size={15} /> Nueva promo
        </button>
      </header>

      {promos.length === 0 && (
        <p className="muted">
          Aún no tienes promos. Las promos aparecen en el InfoLink de tus clientes.
        </p>
      )}

      <div className="pcard">
        {promos.map((p) => (
          <div className="promo-row" key={p.id}>
            <span className="promo-emoji">{p.emoji}</span>
            <div className="promo-info">
              <b className={p.activo ? "" : "off"}>{p.titulo}</b>
              {p.detalle && <small>{p.detalle}</small>}
            </div>
            <span className={"pago-badge " + (p.activo ? "ok" : "bad")}>
              {p.activo ? "Activa" : "Oculta"}
            </span>
            <button className="ic" title={p.activo ? "Ocultar" : "Mostrar"} onClick={() => toggle(p)}>
              {p.activo ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button className="ic" title="Editar" onClick={() => setEditPromo({ ...p })}>
              <Pencil size={16} />
            </button>
            <button className="ic danger" title="Eliminar" onClick={() => eliminar(p)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {editPromo && (
        <div className="sheet-bg"
          onClick={(e) => e.target.classList.contains("sheet-bg") && setEditPromo(null)}>
          <div className="sheet">
            <div className="sheet-head">
              <b>{editPromo.id ? "Editar promo" : "Nueva promo"}</b>
              <button onClick={() => setEditPromo(null)}><X size={18} /></button>
            </div>

            <label className="lbl">Emoji</label>
            <input className="inp" value={editPromo.emoji} maxLength={2}
              style={{ width:64, fontSize:24, textAlign:"center" }}
              onChange={(e) => setEditPromo({ ...editPromo, emoji: e.target.value })} />

            <label className="lbl">Título</label>
            <input className="inp" value={editPromo.titulo}
              onChange={(e) => setEditPromo({ ...editPromo, titulo: e.target.value })}
              placeholder="2x1 en café" />

            <label className="lbl">Detalle (opcional)</label>
            <textarea className="inp" rows={3} value={editPromo.detalle || ""}
              onChange={(e) => setEditPromo({ ...editPromo, detalle: e.target.value })}
              placeholder="Todos los martes, todo el día" />

            <button className="btn-primary big" onClick={guardar} disabled={busy}>
              <Check size={16} /> {busy ? "Guardando…" : "Guardar promo"}
            </button>
          </div>
        </div>
      )}

      {msg && <div className="toast">{msg}</div>}
    </>
  );
}
