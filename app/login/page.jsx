"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { LogIn } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      router.push("/panel");
      router.refresh();
    } catch (e) {
      setErr(e.message || "No se pudo entrar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div className="login-logo">SELLO</div>
        <h1>Panel del negocio</h1>
        <p className="login-sub">Entra para ver pedidos, clientes y sellar.</p>
        <input className="inp" type="email" placeholder="correo" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        <input className="inp" type="password" placeholder="contraseña" value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()} />
        {err && <div className="login-err">{err}</div>}
        <button className="btn-primary big" onClick={submit} disabled={busy}>
          <LogIn size={16} /> {busy ? "Entrando…" : "Entrar"}
        </button>
        <p className="login-fine">¿Sin cuenta? Créala en Supabase → Authentication → Users.</p>
      </div>
    </main>
  );
}
