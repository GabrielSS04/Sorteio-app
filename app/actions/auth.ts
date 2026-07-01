"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Preencha usuário e senha." };
  }

  const { username, password } = parsed.data;

  const rows = (await sql`
    select id, password_hash
    from admins
    where username = ${username}
    limit 1
  `) as { id: string; password_hash: string }[];

  const admin = rows[0];
  // Compara sempre para não vazar (por timing) se o usuário existe.
  const ok = admin
    ? await bcrypt.compare(password, admin.password_hash)
    : await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinva");

  if (!admin || !ok) {
    return { error: "Usuário ou senha inválidos." };
  }

  await createSession(admin.id);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/admin/login");
}
