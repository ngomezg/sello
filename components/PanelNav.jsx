"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import {
  LayoutDashboard, Receipt, UtensilsCrossed, Users, ScanLine,
  LogOut, CreditCard, Tag, Settings, Scan,
} from "lucide-react";

const LINKS = [
  { href: "/panel",                 label: "Resumen",        icon: LayoutDashboard  },
  { href: "/panel/pedidos",         label: "Pedidos",         icon: Receipt          },
  { href: "/panel/menu",            label: "Menú",            icon: UtensilsCrossed  },
  { href: "/panel/promos",          label: "Promos",          icon: Tag              },
  { href: "/panel/clientes",        label: "Clientes",        icon: Users            },
  { href: "/panel/sellar",          label: "Sellar",          icon: ScanLine         },
  { href: "/panel/qr",              label: "QR Mostrador",    icon: Scan       },
  { href: "/panel/configuracion",   label: "Configuración",   icon: Settings         },
];

export default function PanelNav({ email }) {
  const path   = usePathname();
  const router = useRouter();
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser().rpc("es_admin");
      setEsAdmin(!!data);
    })();
  }, []);

  async function salir() {
    await supabaseBrowser().auth.signOut();
    router.push("/login"); router.refresh();
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
          const on   = path === l.href;
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
