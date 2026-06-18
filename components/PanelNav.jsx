"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { LayoutDashboard, Receipt, UtensilsCrossed, Users, ScanLine, LogOut, CreditCard } from "lucide-react";

const LINKS = [
  { href: "/panel", label: "Resumen", icon: LayoutDashboard },
  { href: "/panel/pedidos", label: "Pedidos", icon: Receipt },
  { href: "/panel/menu", label: "Menú", icon: UtensilsCrossed },
  { href: "/panel/clientes", label: "Clientes", icon: Users },
  { href: "/panel/sellar", label: "Sellar", icon: ScanLine },
];

export default function PanelNav({ email }) {
  const path = usePathname();
  const router = useRouter();
  const [esAdmin, setEsAdmin] = useState(false);

  // "Pagos" solo se muestra si la cuenta es administradora de la plataforma
  // (tú). Los dueños de cada negocio nunca ven este link.
  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser().rpc("es_admin");
      setEsAdmin(!!data);
    })();
  }, []);

  async function salir() {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const links = esAdmin
    ? [...LINKS, { href: "/panel/pagos", label: "Pagos", icon: CreditCard }]
    : LINKS;

  return (
    <aside className="pnav">
      <div className="pnav-logo">SELLO</div>
      <nav>
        {links.map((l) => {
          const Icon = l.icon;
          const on = path === l.href;
          return (
            <Link key={l.href} href={l.href} className={on ? "pnav-link on" : "pnav-link"}>
              <Icon size={18} /> <span>{l.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="pnav-foot">
        <span className="pnav-mail">{email}</span>
        <button onClick={salir} className="pnav-out"><LogOut size={16} /> Salir</button>
      </div>
    </aside>
  );
}
