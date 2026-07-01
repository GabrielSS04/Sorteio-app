import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { EditRaffleForm, type EditRaffle } from "./EditRaffleForm";
import type { PrizeInput } from "../../PrizesField";

export default async function EditRafflePage({
  params,
}: {
  params: Promise<{ raffleId: string }>;
}) {
  const { raffleId } = await params;

  const raffleRows = (await sql`
    select id, title, description, type, total_slots, draw_date, slot_price
    from raffles
    where id = ${raffleId}
    limit 1
  `) as EditRaffle[];

  const raffle = raffleRows[0];
  if (!raffle) notFound();

  const prizeRows = (await sql`
    select description, image_url
    from raffle_prizes
    where raffle_id = ${raffleId}
    order by position
  `) as { description: string; image_url: string | null }[];

  const prizes: PrizeInput[] = prizeRows.map((p) => ({
    description: p.description,
    imageUrl: p.image_url ?? "",
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Editar rifa</h1>
        <Link
          href={`/admin/raffles/${raffleId}`}
          className="text-sm text-zinc-500 hover:underline"
        >
          ← Voltar
        </Link>
      </div>

      <EditRaffleForm raffle={raffle} prizes={prizes} />
    </div>
  );
}
