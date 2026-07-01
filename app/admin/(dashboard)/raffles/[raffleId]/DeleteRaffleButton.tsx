"use client";

import { useFormStatus } from "react-dom";
import { deleteRaffle } from "@/app/actions/raffles";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-lg border border-red-300 px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
    >
      {pending ? "Excluindo…" : "Excluir rifa"}
    </button>
  );
}

export function DeleteRaffleButton({ raffleId }: { raffleId: string }) {
  return (
    <form
      action={deleteRaffle}
      onSubmit={(e) => {
        if (
          !confirm(
            "Excluir esta rifa? Todos os números/nomes, prêmios e o resultado do sorteio serão apagados. Essa ação não pode ser desfeita.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="raffleId" value={raffleId} />
      <Btn />
    </form>
  );
}
