"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createRaffle, type CreateRaffleState } from "@/app/actions/raffles";

const inputCls =
  "h-11 rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300";

function FieldError({ state, name }: { state: CreateRaffleState; name: string }) {
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
      {pending ? "Criando…" : "Criar sorteio"}
    </button>
  );
}

export default function NewRafflePage() {
  const [state, formAction] = useActionState<CreateRaffleState, FormData>(
    createRaffle,
    undefined,
  );
  const [type, setType] = useState<"numbers" | "names">("numbers");
  const [prizes, setPrizes] = useState<string[]>([""]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Novo sorteio</h1>
        <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
          ← Voltar
        </Link>
      </div>

      <form action={formAction} className="flex max-w-2xl flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Título
          <input name="title" required className={inputCls} placeholder="Ex.: Rifa da bicicleta" />
          <FieldError state={state} name="title" />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Descrição (opcional)
          <textarea
            name="description"
            rows={2}
            className="rounded-lg border border-zinc-300 bg-transparent p-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm font-medium">
          Tipo do sorteio
          <div className="flex gap-3">
            {(["numbers", "names"] as const).map((t) => (
              <label
                key={t}
                className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                  type === t
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-300 dark:bg-zinc-900"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={type === t}
                  onChange={() => setType(t)}
                />
                {t === "numbers" ? "Números" : "Nomes"}
              </label>
            ))}
          </div>
        </div>

        {type === "numbers" ? (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Quantidade de números
            <input
              name="totalSlots"
              type="number"
              min={1}
              max={100000}
              defaultValue={100}
              className={inputCls}
            />
            <FieldError state={state} name="totalSlots" />
          </label>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nomes (um por linha)
            <textarea
              name="names"
              rows={6}
              placeholder={"João\nMaria\nPedro"}
              className="rounded-lg border border-zinc-300 bg-transparent p-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
            />
            <FieldError state={state} name="names" />
          </label>
        )}

        <div className="flex flex-col gap-2 text-sm font-medium">
          Prêmios
          {prizes.map((val, i) => (
            <div key={i} className="flex gap-2">
              <input
                name="prizes"
                value={val}
                onChange={(e) => {
                  const next = [...prizes];
                  next[i] = e.target.value;
                  setPrizes(next);
                }}
                placeholder={`${i + 1}º prêmio`}
                className={`${inputCls} flex-1`}
              />
              {prizes.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPrizes(prizes.filter((_, j) => j !== i))}
                  className="rounded-lg border border-zinc-300 px-3 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Remover
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPrizes([...prizes, ""])}
            className="self-start text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            + Adicionar prêmio
          </button>
          <FieldError state={state} name="prizes" />
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Data do sorteio (opcional)
          <input name="drawDate" type="datetime-local" className={inputCls} />
        </label>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {state.error}
          </p>
        )}

        <div className="flex gap-3">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
