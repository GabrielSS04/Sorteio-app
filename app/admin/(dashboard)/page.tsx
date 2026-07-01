import Link from "next/link";
import { sql } from "@/lib/db";
import { drawDateLabel, STATUS_LABEL, TYPE_LABEL } from "@/lib/format";

type RaffleRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  total_slots: number;
  draw_date: string | null;
  taken: number;
};

export default async function AdminDashboard() {
  const raffles = (await sql`
    select r.id, r.title, r.type, r.status, r.total_slots, r.draw_date,
           count(s.*) filter (where s.status = 'taken')::int as taken
    from raffles r
    left join raffle_slots s on s.raffle_id = r.id
    group by r.id
    order by r.created_at desc
  `) as RaffleRow[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Sorteios</h1>
        <Link
          href="/admin/raffles/new"
          className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium leading-10 text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          + Novo sorteio
        </Link>
      </div>

      {raffles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-700">
          Nenhum sorteio ainda. Crie o primeiro.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {raffles.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/raffles/${r.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
              >
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {TYPE_LABEL[r.type]} · {r.taken}/{r.total_slots} marcados · Sorteio: {drawDateLabel(r.draw_date)}
                  </p>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
