"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { drawRaffle, type DrawState } from "@/app/actions/raffles";

function DrawButton({ alreadyDrawn }: { alreadyDrawn: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
    >
      {pending ? "Sorteando…" : alreadyDrawn ? "Sortear novamente" : "Fazer sorteio"}
    </button>
  );
}

export function DrawControls({
  raffleId,
  alreadyDrawn,
}: {
  raffleId: string;
  alreadyDrawn: boolean;
}) {
  const [state, action] = useActionState<DrawState, FormData>(drawRaffle, undefined);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="raffleId" value={raffleId} />
      <DrawButton alreadyDrawn={alreadyDrawn} />
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
          Sorteio realizado! {state.winners} ganhador(es) definido(s).
        </p>
      )}
    </form>
  );
}
