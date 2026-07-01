"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { createRaffleSchema, markSlotSchema, updateRaffleSchema } from "@/lib/validation";

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

  // Prêmios: descrição e imagem vêm em arrays paralelos (uma entrada por linha
  // do formulário, na mesma ordem). Pareamos por índice e descartamos os vazios.
  const prizeDescs = formData.getAll("prizes").map(String);
  const prizeImgs = formData.getAll("prizeImages").map(String);
  const prizeRows = prizeDescs
    .map((description, i) => ({
      description: description.trim(),
      imageUrl: (prizeImgs[i] ?? "").trim(),
    }))
    .filter((p) => p.description.length > 0);

  const parsed = createRaffleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    type,
    totalSlots: formData.get("totalSlots") || undefined,
    slotPrice: formData.get("slotPrice") || undefined,
    promoQuantity: formData.get("promoQuantity") || undefined,
    promoPrice: formData.get("promoPrice") || undefined,
    drawDate: formData.get("drawDate") ?? "",
    prizes: prizeRows,
    names: type === "names" ? splitLines(formData.get("names")) : undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { title, description, drawDate, prizes, slotPrice, promoQuantity, promoPrice } =
    parsed.data;
  const prizeDescriptions = prizes.map((p) => p.description);
  const prizeImages = prizes.map((p) => p.imageUrl || null);

  // Rótulos dos slots: números 1..N ou a lista de nomes.
  const slotLabels =
    parsed.data.type === "numbers"
      ? Array.from({ length: parsed.data.totalSlots! }, (_, i) => String(i + 1))
      : parsed.data.names!;
  const totalSlots = slotLabels.length;

  // Tudo em uma única instrução -> atômico (sem sorteio pela metade).
  const rows = (await sql`
    with new_raffle as (
      insert into raffles (title, description, type, total_slots, slot_price, promo_quantity, promo_price, draw_date, status, created_by)
      values (
        ${title},
        ${description || null},
        ${parsed.data.type},
        ${totalSlots},
        ${slotPrice ?? null},
        ${promoQuantity ?? null},
        ${promoPrice ?? null},
        ${drawDate || null}::timestamptz,
        'open',
        ${admin.id}
      )
      returning id
    ),
    ins_prizes as (
      insert into raffle_prizes (raffle_id, position, description, image_url)
      select nr.id, ord, descr, img
      from new_raffle nr,
           unnest(${prizeDescriptions}::text[], ${prizeImages}::text[])
             with ordinality as t(descr, img, ord)
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
// Editar rifa (admin) — só as infos: título, descrição, valor, data e prêmios
// ---------------------------------------------------------------------------
export type UpdateRaffleState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

export async function updateRaffle(
  _prev: UpdateRaffleState,
  formData: FormData,
): Promise<UpdateRaffleState> {
  await requireAdmin();

  const prizeDescs = formData.getAll("prizes").map(String);
  const prizeImgs = formData.getAll("prizeImages").map(String);
  const prizeRows = prizeDescs
    .map((description, i) => ({
      description: description.trim(),
      imageUrl: (prizeImgs[i] ?? "").trim(),
    }))
    .filter((p) => p.description.length > 0);

  const parsed = updateRaffleSchema.safeParse({
    raffleId: formData.get("raffleId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    slotPrice: formData.get("slotPrice") || undefined,
    promoQuantity: formData.get("promoQuantity") || undefined,
    promoPrice: formData.get("promoPrice") || undefined,
    drawDate: formData.get("drawDate") ?? "",
    prizes: prizeRows,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { raffleId, title, description, slotPrice, promoQuantity, promoPrice, drawDate, prizes } =
    parsed.data;

  await sql`
    update raffles
    set title = ${title},
        description = ${description || null},
        slot_price = ${slotPrice ?? null},
        promo_quantity = ${promoQuantity ?? null},
        promo_price = ${promoPrice ?? null},
        draw_date = ${drawDate || null}::timestamptz
    where id = ${raffleId}
  `;

  // Sincroniza prêmios por posição (preserva IDs -> não perde ganhadores).
  for (let i = 0; i < prizes.length; i++) {
    await sql`
      insert into raffle_prizes (raffle_id, position, description, image_url)
      values (${raffleId}, ${i + 1}, ${prizes[i].description}, ${prizes[i].imageUrl || null})
      on conflict (raffle_id, position) do update
        set description = excluded.description, image_url = excluded.image_url
    `;
  }
  await sql`
    delete from raffle_prizes
    where raffle_id = ${raffleId} and position > ${prizes.length}
  `;

  revalidatePath(`/admin/raffles/${raffleId}`);
  revalidatePath(`/s/${raffleId}`);
  revalidatePath("/admin");
  revalidatePath("/");
  redirect(`/admin/raffles/${raffleId}`);
}

// ---------------------------------------------------------------------------
// Excluir rifa (admin) — apaga em cascata números, prêmios e ganhadores
// ---------------------------------------------------------------------------
export async function deleteRaffle(formData: FormData): Promise<void> {
  await requireAdmin();
  const raffleId = String(formData.get("raffleId") ?? "");
  if (!raffleId) return;

  await sql`delete from raffles where id = ${raffleId}`;

  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
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

  // Rifa sem data definida encerra sozinha quando o último número/nome é vendido.
  await sql`
    update raffles
    set status = 'closed'
    where id = ${raffleId}
      and status = 'open'
      and draw_date is null
      and not exists (
        select 1 from raffle_slots
        where raffle_id = ${raffleId} and status = 'available'
      )
  `;

  revalidatePath(`/admin/raffles/${raffleId}`);
  revalidatePath(`/s/${raffleId}`);
  revalidatePath("/");
  return { ok: true };
}

// Editar os dados do comprador de um número/nome já marcado.
export async function editSlot(
  _prev: MarkSlotState,
  formData: FormData,
): Promise<MarkSlotState> {
  await requireAdmin();

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

  const updated = (await sql`
    update raffle_slots
    set buyer_name = ${buyerName},
        buyer_phone = ${buyerPhone}
    where id = ${slotId}
      and raffle_id = ${raffleId}
      and status = 'taken'
    returning id
  `) as { id: string }[];

  if (updated.length === 0) {
    return { error: "Não foi possível editar (número não está marcado)." };
  }

  revalidatePath(`/admin/raffles/${raffleId}`);
  revalidatePath(`/s/${raffleId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Encerrar / reabrir rifa (admin)
// ---------------------------------------------------------------------------
export async function setRaffleStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const raffleId = String(formData.get("raffleId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!raffleId || (status !== "open" && status !== "closed")) return;

  await sql`
    update raffles
    set status = ${status}
    where id = ${raffleId}
  `;

  revalidatePath(`/admin/raffles/${raffleId}`);
  revalidatePath("/admin");
  revalidatePath(`/s/${raffleId}`);
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Sortear (admin) — escolhe 1 ganhador por prêmio entre os VENDIDOS, sem repetir
// ---------------------------------------------------------------------------
export type DrawState = { ok?: boolean; error?: string; winners?: number } | undefined;

export async function drawRaffle(
  _prev: DrawState,
  formData: FormData,
): Promise<DrawState> {
  await requireAdmin();
  const raffleId = String(formData.get("raffleId") ?? "");
  if (!raffleId) return { error: "Rifa inválida." };

  const info = (await sql`
    select
      r.status,
      (select count(*) from raffle_prizes where raffle_id = r.id)::int as prizes,
      (select count(*) from raffle_slots where raffle_id = r.id and status = 'taken')::int as taken
    from raffles r
    where r.id = ${raffleId}
    limit 1
  `) as { status: string; prizes: number; taken: number }[];

  const row = info[0];
  if (!row) return { error: "Rifa não encontrada." };
  if (row.status !== "closed" && row.status !== "drawn") {
    return { error: "Encerre a rifa antes de realizar o sorteio." };
  }
  if (row.prizes === 0) return { error: "A rifa não tem prêmios cadastrados." };
  if (row.taken === 0) return { error: "Nenhum número/nome foi vendido para sortear." };

  // Uma única instrução, atômica: sorteia (order by random), grava os ganhadores
  // (ON CONFLICT permite re-sortear) e marca a rifa como 'drawn'.
  await sql`
    with prize_list as (
      select id as prize_id, row_number() over (order by position) as rn
      from raffle_prizes
      where raffle_id = ${raffleId}
    ),
    picked as (
      select id as slot_id, row_number() over (order by random()) as rn
      from raffle_slots
      where raffle_id = ${raffleId} and status = 'taken'
    ),
    upd as (
      update raffles set status = 'drawn' where id = ${raffleId} returning 1
    )
    insert into raffle_winners (raffle_id, prize_id, slot_id)
    select ${raffleId}, p.prize_id, k.slot_id
    from prize_list p
    join picked k on p.rn = k.rn
    on conflict (prize_id) do update
      set slot_id = excluded.slot_id, drawn_at = now()
  `;

  revalidatePath(`/admin/raffles/${raffleId}`);
  revalidatePath(`/s/${raffleId}`);
  revalidatePath("/");
  return { ok: true, winners: Math.min(row.prizes, row.taken) };
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
