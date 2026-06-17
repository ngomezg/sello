import "./panel.css";
import { supabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import PanelNav from "@/components/PanelNav";

export default async function PanelLayout({ children }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");        // doble seguro además del middleware

  return (
    <div className="panel">
      <PanelNav email={user.email} />
      <main className="panel-main">{children}</main>
    </div>
  );
}
