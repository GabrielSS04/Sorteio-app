import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { drawDateLabel, formatPrice, formatPromo, TYPE_LABEL } from "@/lib/format";
import { DrawReveal } from "./DrawReveal";

export const dynamic = "force-dynamic";

type Raffle = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  total_slots: number;
  draw_date: string | null;
  slot_price: string | null;
  promo_quantity: number | null;
  promo_price: string | null;
};

export default async function PublicRafflePage({
  params,
}: {
  params: Promise<{ raffleId: string }>;
}) {
  const { raffleId } = await params;

  const raffleRows = (await sql`
    select id, title, description, type, status, total_slots, draw_date, slot_price,
           promo_quantity, promo_price
    from raffles
    where id = ${raffleId}
    limit 1
  `) as Raffle[];

  const raffle = raffleRows[0];
  if (!raffle) notFound();

  // IMPORTANTE: aqui só lemos os DISPONÍVEIS e nunca os dados do comprador.
  const available = (await sql`
    select label
    from raffle_slots
    where raffle_id = ${raffleId}
      and status = 'available'
    order by position
  `) as { label: string }[];

  const prizes = (await sql`
    select position, description, image_url
    from raffle_prizes
    where raffle_id = ${raffleId}
    order by position
  `) as { position: number; description: string; image_url: string | null }[];

  // Ganhadores (visíveis ao público apenas depois do sorteio).
  const winnerRows =
    raffle.status === "drawn"
      ? ((await sql`
          select pz.position, pz.description, sl.label, sl.buyer_name
          from raffle_winners w
          join raffle_prizes pz on pz.id = w.prize_id
          join raffle_slots sl on sl.id = w.slot_id
          where w.raffle_id = ${raffleId}
          order by pz.position
        `) as {
          position: number;
          description: string;
          label: string;
          buyer_name: string | null;
        }[])
      : [];

  const winners = winnerRows.map((w) => ({
    position: w.position,
    description: w.description,
    label: w.label,
    buyerName: w.buyer_name,
  }));

  // Pool de rótulos para a animação "rodar" (só após o sorteio).
  const spinPool =
    raffle.status === "drawn"
      ? ((await sql`
          select label from raffle_slots where raffle_id = ${raffleId}
        `) as { label: string }[]).map((r) => r.label)
      : [];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Todos os sorteios
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{raffle.title}</h1>
      {raffle.description && <p className="mt-1 text-zinc-500">{raffle.description}</p>}

      {raffle.status === "closed" && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
          ⏳ Rifa encerrada — o sorteio será realizado em breve. Volte para ver o
          resultado!
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
        <span>{TYPE_LABEL[raffle.type]}</span>
        <span>Sorteio: {drawDateLabel(raffle.draw_date)}</span>
        {formatPrice(raffle.slot_price) && (
          <span>
            Valor: {formatPrice(raffle.slot_price)} por{" "}
            {raffle.type === "numbers" ? "número" : "nome"}
          </span>
        )}
        {formatPromo(raffle.promo_quantity, raffle.promo_price) && (
          <span className="font-medium text-amber-700 dark:text-amber-400">
            🔥 Promo: {formatPromo(raffle.promo_quantity, raffle.promo_price)}
          </span>
        )}
        {raffle.status === "open" && (
          <span className="font-medium text-emerald-700 dark:text-emerald-400">
            {available.length} de {raffle.total_slots} disponíveis
          </span>
        )}
      </div>

      {raffle.status === "drawn" && winners.length > 0 && (
        <DrawReveal winners={winners} pool={spinPool} type={raffle.type} />
      )}

      {prizes.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-zinc-500">Prêmios</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {prizes.map((p) => (
              <li
                key={p.position}
                className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
              >
                {p.image_url && (
                  <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-900">
                    <Image
                      src={p.image_url}
                      alt={p.description}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="px-3 py-2 text-sm">
                  <span className="font-medium">{p.position}º</span> {p.description}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {raffle.status === "open" && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold text-zinc-500">
            {raffle.type === "numbers" ? "Números disponíveis" : "Nomes disponíveis"}
          </h2>

          {available.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">
              Tudo marcado! Não há mais disponíveis.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(1.75rem,1fr))] gap-1 sm:grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] sm:gap-1.5">
              {available.map((s) => (
                <div
                  key={s.label}
                  className="flex h-7 items-center justify-center rounded-md border border-zinc-300 px-0.5 text-center text-[10px] font-medium dark:border-zinc-700 sm:h-9 sm:text-xs"
                >
                  <span className="w-full truncate">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
