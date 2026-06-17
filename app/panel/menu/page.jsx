"use client";
import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import {
  Plus, Trash2, Pencil, Check, X, GripVertical, Eye, EyeOff,
} from "lucide-react";

const money = (n) => "$" + Number(n || 0).toLocaleString("es-CO");

export default function MenuEditor() {
  const supabase = supabaseBrowser();
  const [negocio, setNegocio] = useState(null);
  const [cats, setCats] = useState([]);
  const [nuevaCat, setNuevaCat] = useState("");
  const [editItem, setEditItem] = useState(null); // {categoria_id, ...item} o null
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const toast = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2500); };

  // Carga el negocio del dueño + sus categorías con productos
  const cargar = useCallback(async () => {
    // Filtra por el dueño: 'negocios' tiene lectura pública, sin este filtro
    // .single() fallaría al haber varios negocios activos.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: n } = await supabase.from("negocios")
      .select("id,nombre,handle").eq("owner_id", user.id).maybeSingle();
    if (!n) { setLoading(false); return; }
    setNegocio(n);
    const { data } = await supabase
      .from("menu_categorias")
      .select("id,nombre,orden,menu_items(id,nombre,precio,tag,img_url,disponible,orden)")
      .eq("negocio_id", n.id).order("orden");
    // Ordena los productos dentro de cada categoría
    (data || []).forEach((c) => c.menu_items?.sort((a, b) => (a.orden || 0) - (b.orden || 0)));
    setCats(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // --- Categorías ---
  async function addCat() {
    const nombre = nuevaCat.trim();
    if (!nombre || !negocio) return;
    const { error } = await supabase.from("menu_categorias")
      .insert({ negocio_id: negocio.id, nombre, orden: cats.length });
    if (error) return toast("No se pudo crear");
    setNuevaCat(""); toast("Categoría creada"); cargar();
  }
  async function renameCat(c, nombre) {
    if (!nombre.trim() || nombre === c.nombre) return;
    await supabase.from("menu_categorias").update({ nombre }).eq("id", c.id);
    toast("Guardado"); cargar();
  }
  async function delCat(c) {
    if (!confirm(`¿Eliminar "${c.nombre}" y sus productos?`)) return;
    await supabase.from("menu_categorias").delete().eq("id", c.id); // borra productos en cascada
    toast("Categoría eliminada"); cargar();
  }

  // --- Productos ---
  function nuevoItem(categoria_id) {
    setEditItem({ categoria_id, nombre: "", precio: "", tag: "", img_url: "", disponible: true });
  }
  async function guardarItem() {
    const it = editItem;
    if (!it.nombre.trim() || !it.precio) return toast("Falta nombre o precio");
    const payload = {
      nombre: it.nombre.trim(),
      precio: parseInt(it.precio, 10) || 0,
      tag: it.tag?.trim() || null,
      img_url: it.img_url?.trim() || null,
      disponible: it.disponible,
    };
    let error;
    if (it.id) {
      ({ error } = await supabase.from("menu_items").update(payload).eq("id", it.id));
    } else {
      const cat = cats.find((c) => c.id === it.categoria_id);
      ({ error } = await supabase.from("menu_items").insert({
        ...payload, negocio_id: negocio.id, categoria_id: it.categoria_id,
        orden: cat?.menu_items?.length || 0,
      }));
    }
    if (error) return toast("No se pudo guardar");
    setEditItem(null); toast("Producto guardado"); cargar();
  }
  async function toggleDisp(item) {
    await supabase.from("menu_items").update({ disponible: !item.disponible }).eq("id", item.id);
    cargar();
  }
  async function delItem(item) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
    await supabase.from("menu_items").delete().eq("id", item.id);
    toast("Producto eliminado"); cargar();
  }

  if (loading) return <div className="loading">Cargando menú…</div>;
  if (!negocio) return <div className="loading">Primero conecta tu negocio en Resumen.</div>;

  return (
    <>
      <header className="ph">
        <h1>Menú</h1>
        <a className="btn-ghost sm" href={`/i/${negocio.handle}/menu`} target="_blank" rel="noreferrer">
          <Eye size={14} /> Ver público
        </a>
      </header>

      {/* Crear categoría */}
      <div className="pcard">
        <div className="row-add">
          <input className="inp" placeholder="Nueva categoría (ej: Bebidas)"
            value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCat()} />
          <button className="btn-primary sm" onClick={addCat}><Plus size={16} /> Añadir</button>
        </div>
      </div>

      {cats.length === 0 && <p className="muted">Aún no tienes categorías. Crea la primera arriba.</p>}

      {cats.map((c) => (
        <div className="mcat" key={c.id}>
          <CatHeader c={c} onRename={renameCat} onDelete={() => delCat(c)} />

          {(c.menu_items || []).map((it) => (
            <div className="mitem" key={it.id}>
              {it.img_url
                ? <img src={it.img_url} alt={it.nombre} />
                : <div className="mitem-noimg" />}
              <div className="mitem-info">
                <b className={it.disponible ? "" : "off"}>{it.nombre}</b>
                <span className="mitem-price">{money(it.precio)}{it.tag ? ` · ${it.tag}` : ""}</span>
              </div>
              <button className="ic" title={it.disponible ? "Ocultar" : "Mostrar"} onClick={() => toggleDisp(it)}>
                {it.disponible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button className="ic" title="Editar" onClick={() => setEditItem({ ...it, categoria_id: c.id })}>
                <Pencil size={16} />
              </button>
              <button className="ic danger" title="Eliminar" onClick={() => delItem(it)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <button className="add-item" onClick={() => nuevoItem(c.id)}>
            <Plus size={15} /> Agregar producto
          </button>
        </div>
      ))}

      {/* Sheet de edición de producto */}
      {editItem && (
        <div className="sheet-bg" onClick={(e) => e.target.classList.contains("sheet-bg") && setEditItem(null)}>
          <div className="sheet">
            <div className="sheet-head">
              <b>{editItem.id ? "Editar producto" : "Nuevo producto"}</b>
              <button onClick={() => setEditItem(null)}><X size={18} /></button>
            </div>
            <label className="lbl">Nombre</label>
            <input className="inp" value={editItem.nombre}
              onChange={(e) => setEditItem({ ...editItem, nombre: e.target.value })} />
            <label className="lbl">Precio (COP)</label>
            <input className="inp" type="number" inputMode="numeric" value={editItem.precio}
              onChange={(e) => setEditItem({ ...editItem, precio: e.target.value })} />
            <label className="lbl">Etiqueta (opcional)</label>
            <input className="inp" placeholder="Nuevo, Más pedido…" value={editItem.tag || ""}
              onChange={(e) => setEditItem({ ...editItem, tag: e.target.value })} />
            <label className="lbl">URL de imagen (opcional)</label>
            <input className="inp" placeholder="https://…" value={editItem.img_url || ""}
              onChange={(e) => setEditItem({ ...editItem, img_url: e.target.value })} />
            <label className="check">
              <input type="checkbox" checked={editItem.disponible}
                onChange={(e) => setEditItem({ ...editItem, disponible: e.target.checked })} />
              Disponible
            </label>
            <button className="btn-primary big" onClick={guardarItem}><Check size={16} /> Guardar producto</button>
          </div>
        </div>
      )}

      {msg && <div className="toast">{msg}</div>}
    </>
  );
}

// Cabecera de categoría con edición inline del nombre
function CatHeader({ c, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(c.nombre);
  return (
    <div className="mcat-head">
      <GripVertical size={16} className="grip" />
      {editing ? (
        <>
          <input className="inp slim" value={val} onChange={(e) => setVal(e.target.value)} autoFocus />
          <button className="ic" onClick={() => { onRename(c, val); setEditing(false); }}><Check size={16} /></button>
          <button className="ic" onClick={() => { setVal(c.nombre); setEditing(false); }}><X size={16} /></button>
        </>
      ) : (
        <>
          <h2 className="mcat-name">{c.nombre}</h2>
          <button className="ic" title="Renombrar" onClick={() => setEditing(true)}><Pencil size={15} /></button>
          <button className="ic danger" title="Eliminar" onClick={onDelete}><Trash2 size={15} /></button>
        </>
      )}
    </div>
  );
}
