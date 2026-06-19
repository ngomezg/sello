"use client";
import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Check } from "lucide-react";

const VACIO = { emoji: "🎟️", titulo: "", detalle: "", activo: true };

// Emojis frecuentes para negocios de hostelería y retail
const EMOJIS = [
  "🎟️","🎁","🎂","🎉","☕","🍕","🍔","🍦","🥤","🍰",
  "💆","✂️","💅","🌟","⚡","🔥","💸","🛍️","🏷️","🎶",
];

export default function Promos() {
  const supabase = supabaseBrowser();
  const [negocio, setNegocio]     = useState(null);
  const [promos, setPromos]       = useState([]);
  const [editPromo, setEditPromo] = useState(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [busy, setBusy]           = useState(false);
  const [msg, setMsg]             = useState("");

  const toast = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2500); };

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: n } = await supabase.from("negocios")
      .select("id,handle,color").eq("owner_id", user.id).maybeSingle();
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

  const color = negocio?.color || "#7A1B2E";

  return (
    <>
      <header className="ph">
        <h1>Promos</h1>
        <button className="btn-primary sm" onClick={() => { setEditPromo({ ...VACIO }); setShowEmojis(false); }}>
          <Plus size={15} /> Nueva promo
        </button>
      </header>

      {promos.length === 0 && (
        <div className="promo-empty">
          <span style={{ fontSize: 36 }}>🎟️</span>
          <p>Aún no tienes promos.<br />Aparecen en el InfoLink de tus clientes.</p>
          <button className="btn-primary sm"
            onClick={() => { setEditPromo({ ...VACIO }); setShowEmojis(false); }}>
            <Plus size={14} /> Crear primera promo
          </button>
        </div>
      )}

      {/* Grid de promos activas + ocultas */}
      {promos.length > 0 && (
        <div className="promo-grid">
          {promos.map((p) => (
            <div className={"promo-card " + (p.activo ? "" : "promo-off")} key={p.id}>
              {/* Vista previa: así la verá el cliente */}
              <div className="promo-preview" style={{ "--pc": color }}>
                <span className="promo-preview-emoji">{p.emoji}</span>
                <div>
                  <b>{p.titulo}</b>
                  {p.detalle && <small>{p.detalle}</small>}
                </div>
              </div>
              <div className="promo-card-foot">
                <span className={"pago-badge " + (p.activo ? "ok" : "bad")}>
                  {p.activo ? "Visible" : "Oculta"}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="ic" title={p.activo ? "Ocultar" : "Mostrar"} onClick={() => toggle(p)}>
                    {p.activo ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button className="ic" title="Editar"
                    onClick={() => { setEditPromo({ ...p }); setShowEmojis(false); }}>
                    <Pencil size={15} />
                  </button>
                  <button className="ic danger" title="Eliminar" onClick={() => eliminar(p)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sheet de edición */}
      {editPromo && (
        <div className="sheet-bg"
          onClick={(e) => e.target.classList.contains("sheet-bg") && setEditPromo(null)}>
          <div className="sheet">
            <div className="sheet-head">
              <b>{editPromo.id ? "Editar promo" : "Nueva promo"}</b>
              <button onClick={() => setEditPromo(null)}><X size={18} /></button>
            </div>

            {/* Selector de emoji */}
            <label className="lbl">Emoji</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <button
                className="emoji-sel-btn"
                onClick={() => setShowEmojis(!showEmojis)}
                title="Elegir emoji"
              >
                {editPromo.emoji}
              </button>
              <span className="muted" style={{ fontSize: 12 }}>
                Toca para elegir o escribe uno
              </span>
            </div>
            {showEmojis && (
              <div className="emoji-picker">
                {EMOJIS.map((e) => (
                  <button key={e} className="emoji-opt"
                    onClick={() => { setEditPromo({ ...editPromo, emoji: e }); setShowEmojis(false); }}>
                    {e}
                  </button>
                ))}
              </div>
            )}

            <label className="lbl">Título</label>
            <input className="inp" value={editPromo.titulo} placeholder="2x1 en café"
              onChange={(ev) => setEditPromo({ ...editPromo, titulo: ev.target.value })} />

            <label className="lbl">Detalle (opcional)</label>
            <textarea className="inp" rows={2} value={editPromo.detalle || ""}
              placeholder="Todos los martes, todo el día"
              onChange={(ev) => setEditPromo({ ...editPromo, detalle: ev.target.value })} />

            {/* Vista previa en vivo */}
            {editPromo.titulo && (
              <>
                <label className="lbl" style={{ marginTop: 4 }}>Vista previa</label>
                <div className="promo-preview" style={{ "--pc": color, marginBottom: 14 }}>
                  <span className="promo-preview-emoji">{editPromo.emoji}</span>
                  <div>
                    <b>{editPromo.titulo}</b>
                    {editPromo.detalle && <small>{editPromo.detalle}</small>}
                  </div>
                </div>
              </>
            )}

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
