"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { createRaffleSchema, markSlotSchema } from "@/lib/validation";

// ---------------------------------------------------------------------------
// Criar sorteio
// ---------------------------------------------------------------------------
export type CreateRaffleState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

function splitLines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function createRaffle(
  _prev: CreateRaffleState,
  formData: FormData,
): Promise<CreateRaffleState> {
  const admin = await requireAdmin();

  const type = formData.get("type");
  const parsed = createRaffleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    type,
    totalSlots: formData.get("totalSlots") || undefined,
    drawDate: formData.get("drawDate") ?? "",
    prizes: formData.getAll("prizes").map(String).map((s) => s.trim()).filter(Boolean),
    names: type === "names" ? splitLines(formData.get("names")) : undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { title, description, drawDate, prizes } = parsed.data;

  // Rótulos dos slots: números 1..N ou a lista de nomes.
  const slotLabels =
    parsed.data.type === "numbers"
      ? Array.from({ length: parsed.data.totalSlots! }, (_, i) => String(i + 1))
      : parsed.data.names!;
  const totalSlots = slotLabels.length;

  // Tudo em uma única instrução -> atômico (sem sorteio pela metade).
  const rows = (await sql`
    with new_raffle as (
      insert into raffles (title, description, type, total_slots, draw_date, status, created_by)
      values (
        ${title},
        ${description || null},
        ${parsed.data.type},
        ${totalSlots},
        ${drawDate || null}::timestamptz,
        'open',
        ${admin.id}
      )
      returning id
    ),
    ins_prizes as (
      insert into raffle_prizes (raffle_id, position, description)
      select nr.id, ord, descr
      from new_raffle nr,
           unnest(${prizes}::text[]) with ordinality as t(descr, ord)
      returning 1
    ),
    ins_slots as (
      insert into raffle_slots (raffle_id, position, label)
      select nr.id, ord, label
      from new_raffle nr,
           unnest(${slotLabels}::text[]) with ordinality as t(label, ord)
      returning 1
    )
    select id from new_raffle
  `) as { id: string }[];

  const raffleId = rows[0].id;
  revalidatePath("/admin");
  redirect(`/admin/raffles/${raffleId}`);
}

// ---------------------------------------------------------------------------
// Marcar / desmarcar um número ou nome
// ---------------------------------------------------------------------------
export type MarkSlotState = { ok?: boolean; error?: string } | undefined;

export async function markSlot(
  _prev: MarkSlotState,
  formData: FormData,
): Promise<MarkSlotState> {
  const admin = await requireAdmin();

  const parsed = markSlotSchema.safeParse({
    slotId: formData.get("slotId"),
    raffleId: formData.get("raffleId"),
    buyerName: formData.get("buyerName"),
    buyerPhone: formData.get("buyerPhone"),
  });

  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { error: first ?? "Dados inválidos." };
  }

  const { slotId, raffleId, buyerName, buyerPhone } = parsed.data;

  // WHERE status='available' evita marcação dupla em concorrência.
  const updated = (await sql`
    update raffle_slots
    set status = 'taken',
        buyer_name = ${buyerName},
        buyer_phone = ${buyerPhone},
        marked_by = ${admin.id},
        marked_at = now()
    where id = ${slotId}
      and raffle_id = ${raffleId}
      and status = 'available'
    returning id
  `) as { id: string }[];

  if (updated.length === 0) {
    return { error: "Este número/nome já está marcado." };
  }

  revalidatePath(`/admin/raffles/${raffleId}`);
  revalidatePath(`/s/${raffleId}`);
  return { ok: true };
}

export async function unmarkSlot(formData: FormData): Promise<void> {
  await requireAdmin();
  const slotId = String(formData.get("slotId") ?? "");
  const raffleId = String(formData.get("raffleId") ?? "");
  if (!slotId || !raffleId) return;

  await sql`
    update raffle_slots
    set status = 'available',
        buyer_name = null,
        buyer_phone = null,
        marked_by = null,
        marked_at = null
    where id = ${slotId}
      and raffle_id = ${raffleId}
  `;

  revalidatePath(`/admin/raffles/${raffleId}`);
  revalidatePath(`/s/${raffleId}`);
}
