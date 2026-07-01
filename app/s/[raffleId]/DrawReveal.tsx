"use client";

import { useEffect, useState } from "react";

export type RevealWinner = {
  position: number;
  description: string;
  label: string;
  buyerName: string | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Reveal animado do sorteio: para cada prêmio, os números/nomes "rodam" e
 * desaceleram até parar no ganhador, revelando o nome de quem escolheu.
 * (Não mostra telefone.)
 */
export function DrawReveal({
  winners,
  pool,
  type,
}: {
  winners: RevealWinner[];
  pool: string[];
  type: string;
}) {
  const [display, setDisplay] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const spinPool = pool.length > 0 ? pool : winners.map((w) => w.label);

    async function run() {
      setPlaying(true);
      setRevealed([]);
      setDisplay({});

      for (const w of winners) {
        const start = performance.now();
        let step = 50;
        while (performance.now() - start < 1600) {
          if (cancelled) return;
          const rnd = spinPool[Math.floor(Math.random() * spinPool.length)];
          setDisplay((d) => ({ ...d, [w.position]: rnd }));
          await sleep(step);
          step = Math.min(step + 6, 130); // desacelera
        }
        if (cancelled) return;
        setDisplay((d) => ({ ...d, [w.position]: w.label }));
        setRevealed((r) => [...r, w.position]);
        await sleep(600);
      }
      if (!cancelled) setPlaying(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [winners, pool, replayKey]);

  const prefix = type === "numbers" ? "Nº " : "";

  return (
    <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-emerald-800 dark:text-emerald-300">
          🎉 Resultado do sorteio
        </h2>
        <button
          type="button"
          onClick={() => !playing && setReplayKey((k) => k + 1)}
          disabled={playing}
          className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        >
          {playing ? "Sorteando…" : "↺ Assistir de novo"}
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {winners.map((w) => {
          const isRevealed = revealed.includes(w.position);
          return (
            <li
              key={w.position}
              className={`rounded-xl border bg-white p-4 transition-colors dark:bg-zinc-950 ${
                isRevealed
                  ? "border-emerald-400 dark:border-emerald-700"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <p className="text-xs font-medium text-zinc-500">
                {w.position}º prêmio · {w.description}
              </p>

              <div className="mt-2 flex items-center gap-3">
                <span
                  className={`inline-flex min-w-16 items-center justify-center rounded-lg px-3 py-2 font-mono text-2xl font-bold tabular-nums transition-transform ${
                    isRevealed
                      ? "bg-emerald-600 text-white"
                      : "animate-pulse bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                  }`}
                >
                  {prefix}
                  {display[w.position] ?? "—"}
                </span>

                <span className="text-sm">
                  {isRevealed ? (
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                      🏆 {w.buyerName ?? "Ganhador"}
                    </span>
                  ) : (
                    <span className="text-zinc-400">sorteando…</span>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
