import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { formatDate, TYPE_LABEL } from "@/lib/format";

export const dynamic = "force-dynamic";

type Raffle = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  total_slots: number;
  draw_date: string | null;
};

export default async function PublicRafflePage({
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

  // IMPORTANTE: aqui só lemos os DISPONÍVEIS e nunca os dados do comprador.
  const available = (await sql`
    select label
    from raffle_slots
    where raffle_id = ${raffleId}
      and status = 'available'
    order by position
  `) as { label: string }[];

  const prizes = (await sql`
    select position, description
    from raffle_prizes
    where raffle_id = ${raffleId}
    order by position
  `) as { position: number; description: string }[];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Todos os sorteios
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{raffle.title}</h1>
      {raffle.description && <p className="mt-1 text-zinc-500">{raffle.description}</p>}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
        <span>{TYPE_LABEL[raffle.type]}</span>
        <span>Sorteio: {formatDate(raffle.draw_date)}</span>
        <span className="font-medium text-emerald-700 dark:text-emerald-400">
          {available.length} de {raffle.total_slots} disponíveis
        </span>
      </div>

      {prizes.length > 0 && (
        <div className="mt-6">
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

      <h2 className="mb-3 mt-8 text-sm font-semibold text-zinc-500">
        {raffle.type === "numbers" ? "Números disponíveis" : "Nomes disponíveis"}
      </h2>

      {available.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">
          Tudo marcado! Não há mais disponíveis.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
          {available.map((s) => (
            <div
              key={s.label}
              className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-1 text-center text-sm font-medium dark:border-zinc-700"
            >
              <span className="w-full truncate">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
