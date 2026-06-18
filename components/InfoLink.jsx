"use client";
import React, { useState, useEffect, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Coffee, MapPin, Star, Plus, Minus, ShoppingBag, X, Share2,
  Gift, ChevronRight, Search, Wallet, Clock, QrCode, Sparkles,
} from "lucide-react";

const money = (n) => "$" + Number(n).toLocaleString("es-CO");

/* Sello de cera (elemento firma de la marca) */
function WaxSeal({ filled, index }) {
  const rot = filled ? (index * 37) % 12 - 6 : 0;
  return (
    <div className={"seal " + (filled ? "seal-on" : "seal-off")} style={{ "--rot": rot + "deg" }}>
      {filled ? <Coffee size={20} strokeWidth={2.4} /> : <span className="seal-dot" />}
    </div>
  );
}

export default function InfoLink({ data, handle }) {
  const { negocio, categorias, promos } = data;
  const meta = negocio.meta_sellos;

  const [token, setToken] = useState(null);
  const [sellos, setSellos] = useState(0);
  const [premios, setPremios] = useState(0);
  const [pushOk, setPushOk] = useState(false);       // ya suscrito
  const [cerca, setCerca] = useState(false);          // está cerca del negocio
  const [pushBanner, setPushBanner] = useState(false); // mostrar banner de suscripción

  const [activeCat, setActiveCat] = useState(categorias[0]?.id);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wallet, setWallet] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletErr, setWalletErr] = useState("");
  const [showHorario, setShowHorario] = useState(false);
  const [promoSel, setPromoSel] = useState(null);
  const [shareMsg, setShareMsg] = useState("");

  // "Llegar": abre Google Maps con el nombre+ciudad del negocio.
  // No guardamos lat/lng todavía, así que usamos búsqueda por texto (funciona bien).
  function abrirMapa() {
    const q = encodeURIComponent(`${negocio.nombre} ${negocio.ciudad || ""}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  }

  // "Compartir": usa el share nativo del teléfono si existe; si no, copia el link.
  async function compartir() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `¡Mira mi tarjeta de fidelidad en ${negocio.nombre}!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: negocio.nombre, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareMsg("Enlace copiado");
        setTimeout(() => setShareMsg(""), 2200);
      }
    } catch { /* el usuario canceló el share nativo: no es un error real */ }
  }

  // Google Wallet: pide el link oficial y redirige a "Add to Google Wallet".
  async function addGoogle() {
    if (!token) return;
    setWalletBusy(true); setWalletErr("");
    try {
      const r = await fetch(`/api/wallet/google?token=${token}`).then((x) => x.json());
      if (r.saveUrl) window.location.href = r.saveUrl;
      else setWalletErr(r.error || "No disponible");
    } catch { setWalletErr("No se pudo conectar"); }
    finally { setWalletBusy(false); }
  }

  // Al cargar: si llega un token por URL (?t=...), el cliente está "reclamando"
  // una tarjeta que el staff creó desde el panel — la adopta como suya.
  // Si no, recupera (o crea) su tarjeta normal. Token guardado en el navegador.
  useEffect(() => {
    (async () => {
      try {
        const key = "sello:token:" + handle;
        const urlToken = new URLSearchParams(window.location.search).get("t");

        if (urlToken) {
          const r = await fetch("/api/tarjeta", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ handle, token: urlToken }),
          }).then((x) => x.json());
          if (r && !r.error) {
            localStorage.setItem(key, urlToken);
            setSellos(r.sellos); setPremios(r.premios_ganados); setToken(urlToken);
            // Limpia el ?t= de la barra de direcciones para que no se vuelva a compartir por error.
            window.history.replaceState({}, "", window.location.pathname);
            return;
          }
        }

        let t = localStorage.getItem(key);
        if (t) {
          const r = await fetch("/api/tarjeta", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ handle, token: t }),
          }).then((x) => x.json());
          if (r && !r.error) { setSellos(r.sellos); setPremios(r.premios_ganados); setToken(t); return; }
        }
        const c = await fetch("/api/tarjeta", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle }),
        }).then((x) => x.json());
        if (c?.token) {
          localStorage.setItem(key, c.token);
          setToken(c.token); setSellos(c.sellos); setPremios(c.premios_ganados);
        }
      } catch { /* si falla, sigue como escaparate */ }
    })();
  }, [handle]);

  // Detecta proximidad al negocio y registra el Service Worker para push.
  // Solo se activa si el negocio tiene coordenadas (lat/lng) cargadas.
  useEffect(() => {
    // 1. Registrar Service Worker (necesario para push)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // 2. Comprobar si el usuario ya estaba suscrito antes
    const pushKey = "sello:push:" + handle;
    if (localStorage.getItem(pushKey) === "1") setPushOk(true);
    // 3. Si el negocio tiene ubicación, detectar proximidad
    if (!negocio.lat || !negocio.lng) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const dist = calcDist(pos.coords.latitude, pos.coords.longitude, negocio.lat, negocio.lng);
      if (dist <= (negocio.radio_metros || 300)) {
        setCerca(true);
        // Si está cerca y no está suscrito, mostrar el banner de suscripción
        if (!localStorage.getItem(pushKey)) setTimeout(() => setPushBanner(true), 1500);
      }
    }, () => {}, { timeout: 5000, maximumAge: 60000 });
  }, [handle, negocio.lat, negocio.lng]);

  // Distancia entre dos coordenadas en metros (fórmula de Haversine).
  function calcDist(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Suscribe al usuario a las notificaciones push de este negocio.
  async function suscribirPush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) { alert("Push no configurado aún"); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await fetch("/api/push", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), negocio_id: negocio.id }),
      });
      localStorage.setItem("sello:push:" + handle, "1");
      setPushOk(true); setPushBanner(false);
    } catch (e) {
      alert("No se pudo activar las notificaciones: " + e.message);
    }
  }

  // Convierte la VAPID public key de base64url a Uint8Array (requerido por pushManager).
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  }

  // Refresca el estado al abrir el QR (el staff pudo haber sellado)
  async function refrescar() {
    if (!token) return;
    try {
      const r = await fetch("/api/tarjeta", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, token }),
      }).then((x) => x.json());
      if (r && !r.error) { setSellos(r.sellos); setPremios(r.premios_ganados); }
    } catch {}
  }

  // Carrito
  const cartTotal = useMemo(() => cart.reduce((t, i) => t + i.precio * i.qty, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((t, i) => t + i.qty, 0), [cart]);
  const addToCart = (it) => setCart((c) => {
    const f = c.find((x) => x.id === it.id);
    return f ? c.map((x) => x.id === it.id ? { ...x, qty: x.qty + 1 } : x) : [...c, { ...it, qty: 1 }];
  });
  const dec = (id) => setCart((c) => c.map((x) => x.id === id ? { ...x, qty: x.qty - 1 } : x).filter((x) => x.qty > 0));

  const sendOrder = async () => {
    try {
      const r = await fetch("/api/pedido", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, items: cart, total: cartTotal, token }),
      }).then((x) => x.json());
      if (r?.estado && !r.estado.error) { setSellos(r.estado.sellos); setPremios(r.estado.premios_ganados); }
    } catch {}
    setCart([]); setCartOpen(false);
  };

  const items = useMemo(() => {
    if (q.trim()) return categorias.flatMap((c) => c.items).filter((i) => i.nombre.toLowerCase().includes(q.toLowerCase()));
    return categorias.find((c) => c.id === activeCat)?.items ?? [];
  }, [q, activeCat, categorias]);

  const pct = Math.min(100, (sellos / meta) * 100);
  const left = meta - sellos;

  return (
    <div className="app">
      <div className="biz-head">
        <div className="biz-logo">{negocio.logo_emoji || <Coffee size={22} />}</div>
        <div>
          <h1 className="biz-name">{negocio.nombre}</h1>
          <div className="biz-meta">
            <span className="open">● Abierto</span>
            <Star size={12} className="gold" /> {negocio.rating}
            <span className="dim">({negocio.reviews})</span>
            <MapPin size={12} /> {negocio.ciudad}
          </div>
        </div>
      </div>

      {/* TARJETA DE SELLOS */}
      <div className="card">
        <div className="card-perf" />
        <div className="card-head">
          <span className="eyebrow">Tarjeta de fidelidad</span>
          <span className="card-count">{sellos}<i>/{meta}</i></span>
        </div>
        <div className="seals">
          {[...Array(meta)].map((_, i) => <WaxSeal key={i} index={i} filled={i < sellos} />)}
        </div>
        <div className="prog"><span style={{ width: pct + "%" }} /></div>
        <p className="card-note">
          {left > 0
            ? <>Te faltan <b>{left} sello{left > 1 ? "s" : ""}</b> para <b>{negocio.premio}</b></>
            : <>¡Listo! Muestra tu <b>QR</b> al cajero para canjear 🎉</>}
        </p>
        <div className="card-actions">
          <button className="btn-primary" onClick={() => { refrescar(); setShowQR(true); }}>
            <QrCode size={16} /> Mi QR
          </button>
          <button className="btn-ghost" onClick={() => setWallet(true)}>
            <Wallet size={16} /> Wallet
          </button>
        </div>
        {premios > 0 && (
          <div className="rewards-badge"><Sparkles size={12} /> {premios} premio{premios > 1 ? "s" : ""} ganado{premios > 1 ? "s" : ""}</div>
        )}
      </div>

      <div className="quick">
        <button className="qa" onClick={abrirMapa}><MapPin size={18} /><span>Llegar</span></button>
        <button className="qa" onClick={() => setShowHorario(true)}><Clock size={18} /><span>Horarios</span></button>
        <a className="qa wa" href={negocio.whatsapp ? `https://wa.me/${negocio.whatsapp}` : "#"} target="_blank" rel="noreferrer">
          <Coffee size={18} /><span>WhatsApp</span>
        </a>
      </div>

      {promos.length > 0 && (
        <div className="block">
          <h2 className="h2">Promociones</h2>
          {promos.map((p, i) => (
            <button className="promo" key={i} onClick={() => setPromoSel(p)}>
              <span className="promo-e">{p.emoji}</span>
              <div><b>{p.titulo}</b><small>{p.detalle}</small></div>
              <ChevronRight size={16} className="dim" />
            </button>
          ))}
        </div>
      )}

      <div className="block">
        <div className="menu-top">
          <h2 className="h2">Menú</h2>
          <div className="search">
            <Search size={14} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" />
          </div>
        </div>
        {!q && (
          <div className="cats">
            {categorias.map((c) => (
              <button key={c.id} className={activeCat === c.id ? "cat on" : "cat"} onClick={() => setActiveCat(c.id)}>
                {c.nombre}
              </button>
            ))}
          </div>
        )}
        <div className="items">
          {items.map((it) => (
            <div className="item" key={it.id}>
              {it.img_url && <img src={it.img_url} alt={it.nombre} loading="lazy" />}
              <div className="item-body">
                {it.tag && <span className="item-tag">{it.tag}</span>}
                <b>{it.nombre}</b>
                <span className="price">{money(it.precio)}</span>
              </div>
              <button className="add" onClick={() => addToCart(it)}><Plus size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="refer">
        <Share2 size={18} />
        <div>
          <b>Trae un amigo, ganen ambos</b>
          <small>Tú y tu amigo reciben <b>1 sello</b> extra.</small>
        </div>
        <button className="btn-mini" onClick={compartir}>Compartir</button>
      </div>
      {shareMsg && <p className="share-msg">{shareMsg}</p>}

      <footer className="foot">Hecho con <b>SELLO</b> · tu fidelización en el wallet</footer>

      {cartCount > 0 && (
        <button className="cart-fab" onClick={() => setCartOpen(true)}>
          <ShoppingBag size={18} /> {cartCount} · {money(cartTotal)}
        </button>
      )}

      {cartOpen && (
        <div className="sheet-bg" onClick={(e) => e.target.classList.contains("sheet-bg") && setCartOpen(false)}>
          <div className="sheet">
            <div className="sheet-head"><b>Tu pedido</b><button onClick={() => setCartOpen(false)}><X size={18} /></button></div>
            {cart.map((i) => (
              <div className="cart-row" key={i.id}>
                <span>{i.nombre}</span>
                <div className="qty">
                  <button onClick={() => dec(i.id)}><Minus size={14} /></button>
                  <b>{i.qty}</b>
                  <button onClick={() => addToCart(i)}><Plus size={14} /></button>
                </div>
                <span className="cart-p">{money(i.precio * i.qty)}</span>
              </div>
            ))}
            <button className="btn-primary big" onClick={sendOrder}>
              Enviar pedido · {money(cartTotal)} <ChevronRight size={18} />
            </button>
            <p className="fine">Al pedir sumas <b>1 sello</b> automáticamente.</p>
          </div>
        </div>
      )}

      {/* Mi QR: lo que el staff escanea para sellar */}
      {showQR && (
        <div className="sheet-bg" onClick={(e) => e.target.classList.contains("sheet-bg") && setShowQR(false)}>
          <div className="sheet qr-sheet">
            <div className="sheet-head"><b>Tu tarjeta</b><button onClick={() => setShowQR(false)}><X size={18} /></button></div>
            <div className="qr-frame">
              {token
                ? <QRCodeCanvas value={token} size={188} bgColor="#FFFDF8" fgColor="#241B14" level="M" includeMargin />
                : <span className="muted">Generando…</span>}
            </div>
            <p className="qr-count">{sellos}/{meta} sellos</p>
            <p className="fine">Muéstraselo al cajero para que sume tu sello.</p>
          </div>
        </div>
      )}

      {wallet && (
        <div className="sheet-bg" onClick={(e) => e.target.classList.contains("sheet-bg") && setWallet(false)}>
          <div className="sheet">
            <div className="sheet-head"><b>Agregar a tu Wallet</b><button onClick={() => setWallet(false)}><X size={18} /></button></div>
            <div className="wallet-pass">
              <div className="wp-top">
                <span className="wp-logo"><Coffee size={16} /> {negocio.nombre}</span>
                <span className="wp-kind">SELLO</span>
              </div>
              <div className="wp-stamps">{sellos}/{meta} sellos</div>
              <div className="wp-row"><span>Premio</span><b>{negocio.premio}</b></div>
            </div>
            <div className="wallet-btns">
              <a className="btn-wallet apple" href={token ? `/api/wallet/apple?token=${token}` : undefined}>
                <Wallet size={16} /> Apple Wallet
              </a>
              <button className="btn-wallet google" onClick={addGoogle} disabled={walletBusy}>
                <Wallet size={16} /> {walletBusy ? "Abriendo…" : "Google Wallet"}
              </button>
            </div>
            {walletErr && <p className="fine" style={{ color: "#b3261e" }}>{walletErr}</p>}
            <p className="fine">Sin apps. La tarjeta vive en el wallet y se actualiza sola.</p>
          </div>
        </div>
      )}

      {/* Horarios */}
      {showHorario && (
        <div className="sheet-bg" onClick={(e) => e.target.classList.contains("sheet-bg") && setShowHorario(false)}>
          <div className="sheet">
            <div className="sheet-head"><b>Horarios</b><button onClick={() => setShowHorario(false)}><X size={18} /></button></div>
            {negocio.horario
              ? <p className="horario-text">{negocio.horario}</p>
              : <p className="muted">Este negocio aún no configuró sus horarios.</p>}
          </div>
        </div>
      )}

      {/* Detalle de una promo */}
      {promoSel && (
        <div className="sheet-bg" onClick={(e) => e.target.classList.contains("sheet-bg") && setPromoSel(null)}>
          <div className="sheet">
            <div className="sheet-head"><b>{promoSel.titulo}</b><button onClick={() => setPromoSel(null)}><X size={18} /></button></div>
            <p className="horario-text">{promoSel.emoji} {promoSel.detalle}</p>
          </div>
        </div>
      )}
    </div>
  );
}
