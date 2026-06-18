"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function Confirmado() {
  const [negocioNombre, setNegocioNombre] = useState(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      // Procesa el token del hash de la URL que manda Supabase tras la confirmación.
      await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setListo(true); return; }

      // Si el admin creó el negocio de antemano, el handle llega en ?negocio=
      // Llamamos a reclamar_negocio para vincular este usuario como dueño.
      const negocioHandle = new URLSearchParams(window.location.search).get("negocio");
      if (negocioHandle) {
        await supabase.rpc("reclamar_negocio", { p_handle: negocioHandle });
      }

      // Busca el negocio ya vinculado para personalizar el mensaje.
      const { data: n } = await supabase
        .from("negocios").select("nombre")
        .eq("owner_id", user.id).maybeSingle();
      setNegocioNombre(n?.nombre || null);
      setListo(true);
    })();
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#FFFDF8", padding: "24px"
    }}>
      <div style={{
        maxWidth: 420, width: "100%", textAlign: "center",
        background: "#fff", borderRadius: 20, padding: "40px 32px",
        border: "1px solid #e7d9bf", boxShadow: "0 4px 24px rgba(0,0,0,.06)"
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "#7A1B2E", margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, color: "#fff"
        }}>✓</div>

        <div style={{
          fontFamily: "var(--font-title, serif)", fontSize: 13,
          letterSpacing: 4, color: "#7A1B2E", marginBottom: 8
        }}>
          SELLO
        </div>

        <h1 style={{ fontFamily: "serif", fontSize: 26, margin: "0 0 12px", color: "#241B14" }}>
          ¡Correo confirmado!
        </h1>

        <p style={{ color: "#6b5c4e", fontSize: 15, lineHeight: 1.6, margin: "0 0 8px" }}>
          {listo && negocioNombre
            ? <>Tu negocio <b>"{negocioNombre}"</b> ya está listo y activo.</>
            : "Gracias por confirmar tu correo. Tu cuenta SELLO ya está activa."
          }
        </p>

        <p style={{ color: "#6b5c4e", fontSize: 14, lineHeight: 1.6, margin: "0 0 28px" }}>
          Ya puedes iniciar sesión y comenzar a gestionar tu programa de lealtad.
        </p>

        <Link href="/login" style={{
          display: "inline-block", background: "#7A1B2E", color: "#fff",
          padding: "14px 32px", borderRadius: 12, fontWeight: 700,
          fontSize: 15, textDecoration: "none", letterSpacing: .5
        }}>
          Ir al panel →
        </Link>

        <p style={{ marginTop: 20, fontSize: 12, color: "#a89880" }}>
          ¿Tienes alguna duda? Escríbenos por WhatsApp.
        </p>
      </div>
    </div>
  );
}
