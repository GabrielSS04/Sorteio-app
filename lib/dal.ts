import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";

export type Admin = {
  id: string;
  username: string;
  name: string | null;
};

/**
 * Retorna o admin logado ou null. Memoizado por request com `cache()` para
 * não repetir a query quando chamado em vários lugares na mesma renderização.
 */
export const getCurrentAdmin = cache(async (): Promise<Admin | null> => {
  const session = await getSession();
  if (!session?.adminId) return null;

  const rows = (await sql`
    select id, username, name
    from admins
    where id = ${session.adminId}
    limit 1
  `) as Admin[];

  return rows[0] ?? null;
});

/**
 * Garante que há um admin autenticado. Use no topo de toda página do painel
 * e de toda Server Action de escrita. Redireciona para o login se não houver.
 */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
