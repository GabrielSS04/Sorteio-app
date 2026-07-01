import Link from "next/link";
import { sql } from "@/lib/db";
import { drawDateLabel, formatPrice, TYPE_LABEL } from "@/lib/format";

// Reflete a disponibilidade em tempo real (dados mudam quando o admin marca).
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  type: string;
  draw_date: string | null;
  slot_price: string | null;
  available: number;
};

export default async function Home() {
  const raffles = (await sql`
    select r.id, r.title, r.type, r.draw_date, r.slot_price,
           count(s.*) filter (where s.status = 'available')::int as available
    from raffles r
    left join raffle_slots s on s.raffle_id = r.id
    where r.status = 'open'
    group by r.id
    order by r.created_at desc
  `) as Row[];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Sorteios abertos</h1>
        <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
          Área do admin
        </Link>
      </header>

      {raffles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">
          Nenhum sorteio aberto no momento.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {raffles.map((r) => (
            <li key={r.id}>
              <Link
                href={`/s/${r.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
              >
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {TYPE_LABEL[r.type]} · Sorteio: {drawDateLabel(r.draw_date)}
                    {formatPrice(r.slot_price) && ` · ${formatPrice(r.slot_price)}`}
                  </p>
                </div>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {r.available} disponíveis
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
