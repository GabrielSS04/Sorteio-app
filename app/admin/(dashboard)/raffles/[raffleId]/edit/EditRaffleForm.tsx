"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { updateRaffle, type UpdateRaffleState } from "@/app/actions/raffles";
import { DatePicker } from "../../DatePicker";
import { PrizesField, type PrizeInput } from "../../PrizesField";
import { TYPE_LABEL } from "@/lib/format";

const inputCls =
  "h-11 rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300";

export type EditRaffle = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  total_slots: number;
  draw_date: string | null;
  slot_price: string | null;
};

function FieldError({ state, name }: { state: UpdateRaffleState; name: string }) {
  const msg = state?.fieldErrors?.[name]?.[0];
  if (!msg) return null;
  return <span className="text-xs text-red-600 dark:text-red-400">{msg}</span>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
    >
      {pending ? "Salvando…" : "Salvar alterações"}
    </button>
  );
}

export function EditRaffleForm({
  raffle,
  prizes,
}: {
  raffle: EditRaffle;
  prizes: PrizeInput[];
}) {
  const [state, formAction] = useActionState<UpdateRaffleState, FormData>(
    updateRaffle,
    undefined,
  );
  const unit = raffle.type === "numbers" ? "número" : "nome";

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <input type="hidden" name="raffleId" value={raffle.id} />

      <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900">
        Tipo <strong>{TYPE_LABEL[raffle.type]}</strong> e quantidade{" "}
        <strong>{raffle.total_slots}</strong> não podem ser alterados (os
        números/nomes já existem e podem estar vendidos).
      </p>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Título
        <input
          name="title"
          required
          defaultValue={raffle.title}
          className={inputCls}
        />
        <FieldError state={state} name="title" />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Descrição (opcional)
        <textarea
          name="description"
          rows={2}
          defaultValue={raffle.description ?? ""}
          className="rounded-lg border border-zinc-300 bg-transparent p-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Valor de cada {unit} (opcional)
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">R$</span>
          <input
            name="slotPrice"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={raffle.slot_price ?? ""}
            className={`${inputCls} w-40`}
          />
        </div>
      </label>

      <PrizesField defaultPrizes={prizes} error={state?.fieldErrors?.prizes?.[0]} />

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Data do sorteio (opcional)
        <DatePicker name="drawDate" defaultValue={raffle.draw_date} />
        <span className="text-xs font-normal text-zinc-500">
          Deixe em branco para a rifa encerrar automaticamente quando todos os
          {" "}
          {unit}s forem vendidos.
        </span>
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <SubmitButton />
        <Link
          href={`/admin/raffles/${raffle.id}`}
          className="flex h-11 items-center rounded-lg border border-zinc-300 px-5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
