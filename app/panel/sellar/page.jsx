"use client";
import { useEffect, useRef, useState } from "react";
import { ScanLine, Check, Gift, AlertCircle } from "lucide-react";

// Escáner del staff: lee el QR de la tarjeta del cliente y suma el sello.
// Carga html5-qrcode solo en el navegador (evita romper el SSR).
export default function Sellar() {
  const [estado, setEstado] = useState("idle"); // idle | escaneando | ok | premio | error
  const [msg, setMsg] = useState("");
  const scannerRef = useRef(null);
  const lockRef = useRef(false); // evita doble lectura del mismo QR

  async function iniciar() {
    setEstado("escaneando"); setMsg("");
    lockRef.current = false;
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-box");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 230 },
        onScan,
        () => {}
      );
    } catch (e) {
      setEstado("error"); setMsg("No se pudo abrir la cámara. Revisa permisos.");
    }
  }

  async function detener() {
    try { await scannerRef.current?.stop(); scannerRef.current?.clear(); } catch {}
  }

  async function onScan(text) {
    if (lockRef.current) return;
    lockRef.current = true;
    await detener();
    try {
      const token = parseToken(text);
      const r = await fetch("/api/panel/sellar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).then((x) => x.json());

      if (r.error) { setEstado("error"); setMsg(r.error); return; }
      if (r.premio_desbloqueado) { setEstado("premio"); setMsg("¡Premio! Entrega la recompensa."); }
      else { setEstado("ok"); setMsg(`Sello sumado · ${r.sellos}/${r.meta}`); }
    } catch (e) {
      setEstado("error"); setMsg("QR inválido");
    }
  }

  // El QR puede traer el token solo o una URL con ?t=token
  function parseToken(text) {
    try { const u = new URL(text); return u.searchParams.get("t") || text; }
    catch { return text; }
  }

  useEffect(() => () => { detener(); }, []);

  return (
    <>
      <header className="ph"><h1>Sellar</h1><span className="ph-sub">Escanea el QR del cliente</span></header>

      <div className="scan-card">
        <div id="qr-box" className={"qr-box " + (estado === "escaneando" ? "live" : "")} />

        {estado === "idle" && (
          <button className="btn-primary big" onClick={iniciar}><ScanLine size={16} /> Abrir cámara</button>
        )}
        {estado === "escaneando" && <p className="scan-hint">Apunta al QR de la tarjeta…</p>}

        {estado === "ok" && (
          <div className="scan-res ok"><Check size={28} /><b>{msg}</b>
            <button className="btn-ghost" onClick={iniciar}>Sellar otro</button></div>
        )}
        {estado === "premio" && (
          <div className="scan-res premio"><Gift size={28} /><b>{msg}</b>
            <button className="btn-ghost" onClick={iniciar}>Sellar otro</button></div>
        )}
        {estado === "error" && (
          <div className="scan-res err"><AlertCircle size={28} /><b>{msg}</b>
            <button className="btn-ghost" onClick={iniciar}>Reintentar</button></div>
        )}
      </div>
    </>
  );
}
