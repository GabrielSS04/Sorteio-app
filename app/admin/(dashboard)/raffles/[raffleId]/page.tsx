import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { drawDateLabel, formatPrice, formatPromo, STATUS_LABEL, TYPE_LABEL } from "@/lib/format";
import { setRaffleStatus } from "@/app/actions/raffles";
import { RaffleGrid, type Slot } from "./RaffleGrid";
import { DrawControls } from "./DrawControls";
import { DeleteRaffleButton } from "./DeleteRaffleButton";

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

export default async function RaffleDetailPage({
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

  const prizes = (await sql`
    select position, description, image_url
    from raffle_prizes
    where raffle_id = ${raffleId}
    order by position
  `) as { position: number; description: string; image_url: string | null }[];

  const slots = (await sql`
    select id, position, label, status, buyer_name, buyer_phone
    from raffle_slots
    where raffle_id = ${raffleId}
    order by position
  `) as Slot[];

  const winners = (await sql`
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
  }[];

  const taken = slots.filter((s) => s.status === "taken").length;
  const canDraw = raffle.status === "closed" || raffle.status === "drawn";
  const unitLabel = raffle.type === "numbers" ? "número" : "nome";
  const price = formatPrice(raffle.slot_price);
  const collected = raffle.slot_price
    ? formatPrice(Number(raffle.slot_price) * taken)
    : null;
  const promo = formatPromo(raffle.promo_quantity, raffle.promo_price);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
            ← Sorteios
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{raffle.title}</h1>
          {raffle.description && (
            <p className="mt-1 text-sm text-zinc-500">{raffle.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {STATUS_LABEL[raffle.status] ?? raffle.status}
          </span>
          <Link
            href={`/admin/raffles/${raffle.id}/edit`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Editar
          </Link>
          {raffle.status === "open" ? (
            <form action={setRaffleStatus}>
              <input type="hidden" name="raffleId" value={raffle.id} />
              <input type="hidden" name="status" value="closed" />
              <button
                type="submit"
                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Encerrar rifa
              </button>
            </form>
          ) : raffle.status === "closed" ? (
            <form action={setRaffleStatus}>
              <input type="hidden" name="raffleId" value={raffle.id} />
              <input type="hidden" name="status" value="open" />
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Reabrir rifa
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Info label="Tipo" value={TYPE_LABEL[raffle.type]} />
        <Info label="Marcados" value={`${taken}/${raffle.total_slots}`} />
        <Info label="Disponíveis" value={String(raffle.total_slots - taken)} />
        <Info label="Data do sorteio" value={drawDateLabel(raffle.draw_date)} />
        {price && <Info label={`Valor por ${unitLabel}`} value={price} />}
        {promo && <Info label="Promoção" value={promo} />}
        {collected && <Info label="Arrecadado" value={collected} />}
      </dl>

      {prizes.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-2 text-sm font-semibold text-zinc-500">Prêmios</h2>
          <ul className="flex flex-wrap gap-2">
            {prizes.map((p) => (
              <li
                key={p.position}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 py-1.5 pl-1.5 pr-3 text-sm dark:border-zinc-800"
              >
                {p.image_url && (
                  <Image
                    src={p.image_url}
                    alt={p.description}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-md object-cover"
                  />
                )}
                <span>
                  <span className="font-medium">{p.position}º</span> {p.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canDraw && (
        <div className="mb-8 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-500">Sorteio</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Sorteia 1 ganhador por prêmio entre os {taken} vendidos, sem repetir.
              </p>
            </div>
            <DrawControls raffleId={raffle.id} alreadyDrawn={raffle.status === "drawn"} />
          </div>

          {winners.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-2">
              {winners.map((w) => (
                <li
                  key={w.position}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/30"
                >
                  <span>
                    <span className="font-medium">{w.position}º</span> {w.description}
                  </span>
                  <span className="font-medium text-emerald-800 dark:text-emerald-300">
                    {raffle.type === "numbers" ? "Nº " : ""}
                    {w.label}
                    {w.buyer_name ? ` — ${w.buyer_name}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Ainda não sorteado. Clique em “Fazer sorteio”.
            </p>
          )}
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-zinc-500">
        {raffle.type === "numbers" ? "Números" : "Nomes"} — clique para marcar
      </h2>
      <RaffleGrid raffleId={raffle.id} slots={slots} />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 p-4 dark:border-red-950">
        <div>
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
            Excluir rifa
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Remove a rifa e tudo ligado a ela (números/nomes, prêmios e resultado).
          </p>
        </div>
        <DeleteRaffleButton raffleId={raffle.id} />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}
