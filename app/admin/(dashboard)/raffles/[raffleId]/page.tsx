import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { formatDate, STATUS_LABEL, TYPE_LABEL } from "@/lib/format";
import { RaffleGrid, type Slot } from "./RaffleGrid";

type Raffle = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  total_slots: number;
  draw_date: string | null;
};

export default async function RaffleDetailPage({
  params,
}: {
  params: Promise<{ raffleId: string }>;
}) {
  const { raffleId } = await params;

  const raffleRows = (await sql`
    select id, title, description, type, status, total_slots, draw_date
    from raffles
    where id = ${raffleId}
    limit 1
  `) as Raffle[];

  const raffle = raffleRows[0];
  if (!raffle) notFound();

  const prizes = (await sql`
    select position, description
    from raffle_prizes
    where raffle_id = ${raffleId}
    order by position
  `) as { position: number; description: string }[];

  const slots = (await sql`
    select id, position, label, status, buyer_name, buyer_phone
    from raffle_slots
    where raffle_id = ${raffleId}
    order by position
  `) as Slot[];

  const taken = slots.filter((s) => s.status === "taken").length;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
            ← Sorteios
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{raffle.title}</h1>
          {raffle.description && (
            <p className="mt-1 text-sm text-zinc-500">{raffle.description}</p>
          )}
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {STATUS_LABEL[raffle.status] ?? raffle.status}
        </span>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Info label="Tipo" value={TYPE_LABEL[raffle.type]} />
        <Info label="Marcados" value={`${taken}/${raffle.total_slots}`} />
        <Info label="Disponíveis" value={String(raffle.total_slots - taken)} />
        <Info label="Data do sorteio" value={formatDate(raffle.draw_date)} />
      </dl>

      {prizes.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-2 text-sm font-semibold text-zinc-500">Prêmios</h2>
          <ul className="flex flex-wrap gap-2">
            {prizes.map((p) => (
              <li
                key={p.position}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800"
              >
                <span className="font-medium">{p.position}º</span> {p.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-zinc-500">
        {raffle.type === "numbers" ? "Números" : "Nomes"} — clique para marcar
      </h2>
      <RaffleGrid raffleId={raffle.id} slots={slots} />
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
