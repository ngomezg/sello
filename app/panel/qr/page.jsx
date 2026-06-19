"use client";
import { useEffect, useState, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { QRCodeCanvas } from "qrcode.react";
import { Printer, ExternalLink } from "lucide-react";

export default function QRMostrador() {
  const supabase = supabaseBrowser();
  const [negocio, setNegocio] = useState(null);
  const [url, setUrl]         = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: n } = await supabase.from("negocios")
        .select("id,handle,nombre,logo_emoji,color,meta_sellos,premio,ciudad")
        .eq("owner_id", user.id).maybeSingle();
      if (!n) return;
      setNegocio(n);
      setUrl(`${window.location.origin}/i/${n.handle}/menu`);
    })();
  }, []);

  if (!negocio) return <div className="loading">Cargando…</div>;

  const color = negocio.color || "#7A1B2E";

  return (
    <>
      {/* Controles — se ocultan al imprimir */}
      <header className="ph no-print">
        <h1>QR para el mostrador</h1>
        <div style={{ display:"flex", gap:8 }}>
          <a className="btn-ghost sm" href={url} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> Ver InfoLink
          </a>
          <button className="btn-primary sm" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </header>

      <p className="muted no-print" style={{ marginBottom: 20 }}>
        Imprime esta página y pégala en la caja o el mostrador.
        El cliente escanea el QR con la cámara de su celular.
      </p>

      {/* Hoja imprimible — ocupa una página A4 */}
      <div className="qr-sheet" style={{ "--color": color }}>

        {/* Encabezado con color del negocio */}
        <div className="qr-sheet-top">
          <span className="qr-sheet-emoji">{negocio.logo_emoji}</span>
          <h2 className="qr-sheet-nombre">{negocio.nombre}</h2>
          {negocio.ciudad && <p className="qr-sheet-ciudad">{negocio.ciudad}</p>}
        </div>

        {/* Mensaje principal */}
        <div className="qr-sheet-body">
          <p className="qr-sheet-cta">
            ¡Acumula sellos y gana premios!
          </p>
          <p className="qr-sheet-sub">
            Escanea el código con la cámara de tu celular
          </p>

          {/* QR grande */}
          <div className="qr-sheet-qr">
            {url && (
              <QRCodeCanvas
                value={url}
                size={240}
                bgColor="#FFFFFF"
                fgColor="#1a1008"
                level="M"
                includeMargin={false}
              />
            )}
          </div>

          {/* Explicación del programa */}
          <div className="qr-sheet-premio" style={{ borderColor: color }}>
            <span className="qr-sheet-meta">
              Completa <b>{negocio.meta_sellos} sellos</b> y gana:
            </span>
            <span className="qr-sheet-reward">{negocio.premio || "1 producto gratis"}</span>
          </div>

          {/* Pasos simples */}
          <div className="qr-sheet-steps">
            <div className="qr-step">
              <span className="qr-step-num" style={{ background: color }}>1</span>
              <span>Escanea el QR</span>
            </div>
            <div className="qr-step-sep">→</div>
            <div className="qr-step">
              <span className="qr-step-num" style={{ background: color }}>2</span>
              <span>Pide tu sello en caja</span>
            </div>
            <div className="qr-step-sep">→</div>
            <div className="qr-step">
              <span className="qr-step-num" style={{ background: color }}>3</span>
              <span>¡Reclama tu premio!</span>
            </div>
          </div>
        </div>

        {/* Pie con URL y marca SELLO */}
        <div className="qr-sheet-foot">
          <span className="qr-sheet-url">{url}</span>
          <span className="qr-sheet-brand">Powered by SELLO</span>
        </div>
      </div>
    </>
  );
}
