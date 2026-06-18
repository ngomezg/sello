"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Rocket } from "lucide-react";

export default function Registro() {
  const router = useRouter();
  const [form, setForm] = useState({
    correo: "", clave: "", nombre: "", handle: "", ciudad: "", whatsapp: "",
  });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setErr(""); setOk(""); setBusy(true);
    try {
      const supabase = supabaseBrowser();
      // Normaliza el identificador: solo minúsculas, números y guiones
      // (es lo que va en la URL pública del negocio).
      const handle = form.handle.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

      if (!form.correo || !form.clave || !form.nombre || !handle) {
        setErr("Completa correo, contraseña, nombre del negocio y el identificador.");
        setBusy(false); return;
      }

      const { data: signData, error: signErr } = await supabase.auth.signUp({
        email: form.correo, password: form.clave,
      });
      if (signErr) throw signErr;

      // Si Supabase exige confirmar el correo, todavía no hay sesión activa:
      // no podemos crear el negocio aún (las funciones necesitan auth.uid()).
      if (!signData.session) {
        setOk("Cuenta creada. Revisa tu correo, confirma el enlace, y luego inicia sesión para terminar de crear tu negocio.");
        setBusy(false); return;
      }

      const { data: neg, error: negErr } = await supabase.rpc("crear_negocio_propio", {
        p_handle: handle,
        p_nombre: form.nombre,
        p_ciudad: form.ciudad || null,
        p_whatsapp: form.whatsapp || null,
      });
      if (negErr) throw negErr;
      if (neg?.error) { setErr(neg.error); setBusy(false); return; }

      router.push("/panel");
      router.refresh();
    } catch (e) {
      setErr(e.message || "No se pudo crear la cuenta");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div className="login-logo">SELLO</div>
        <h1>Crea tu cuenta</h1>
        <p className="login-sub">14 días gratis. Sin tarjeta.</p>

        <input className="inp" placeholder="correo" value={form.correo}
          onChange={(e) => set("correo", e.target.value)} />
        <input className="inp" type="password" placeholder="contraseña" value={form.clave}
          onChange={(e) => set("clave", e.target.value)} />
        <input className="inp" placeholder="Nombre del negocio (ej: Café del Valle)" value={form.nombre}
          onChange={(e) => set("nombre", e.target.value)} />
        <input className="inp" placeholder="Identificador para tu link (ej: cafedelvalle)" value={form.handle}
          onChange={(e) => set("handle", e.target.value)} />
        <input className="inp" placeholder="Ciudad (opcional)" value={form.ciudad}
          onChange={(e) => set("ciudad", e.target.value)} />
        <input className="inp" placeholder="WhatsApp (opcional, ej: 573001112233)" value={form.whatsapp}
          onChange={(e) => set("whatsapp", e.target.value)} />

        {err && <div className="login-err">{err}</div>}
        {ok && <div className="login-ok">{ok}</div>}

        <button className="btn-primary big" onClick={submit} disabled={busy}>
          <Rocket size={16} /> {busy ? "Creando…" : "Crear mi cuenta"}
        </button>
        <p className="login-fine">¿Ya tienes cuenta? <a href="/login">Entra aquí</a></p>
      </div>
    </main>
  );
}
