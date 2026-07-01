"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { createRaffle, type CreateRaffleState } from "@/app/actions/raffles";
import { generateNames, NAME_POOL } from "@/lib/names";

type Prize = { description: string; imageUrl: string; uploading?: boolean };

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
  const [prizes, setPrizes] = useState<Prize[]>([{ description: "", imageUrl: "" }]);

  function patchPrize(i: number, patch: Partial<Prize>) {
    setPrizes((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }

  async function handlePrizeFile(i: number, file: File | undefined) {
    if (!file) return;
    patchPrize(i, { uploading: true });
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/prize-upload",
      });
      patchPrize(i, { imageUrl: blob.url, uploading: false });
    } catch (err) {
      patchPrize(i, { uploading: false });
      alert(
        "Falha no upload da imagem: " +
          (err instanceof Error ? err.message : "erro desconhecido"),
      );
    }
  }
  const [names, setNames] = useState("");
  const [genCount, setGenCount] = useState(20);
  const [nameMode, setNameMode] = useState<"manual" | "auto">("manual");

  const nameCount = names.split("\n").map((n) => n.trim()).filter(Boolean).length;

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
          <div className="flex flex-col gap-2 text-sm font-medium">
            Nomes
            <div className="flex gap-2">
              {(["manual", "auto"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setNameMode(m)}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    nameMode === m
                      ? "border-zinc-900 bg-zinc-50 dark:border-zinc-300 dark:bg-zinc-900"
                      : "border-zinc-300 text-zinc-500 dark:border-zinc-700"
                  }`}
                >
                  {m === "manual" ? "Digitar manualmente" : "Gerar automaticamente"}
                </button>
              ))}
            </div>

            {nameMode === "auto" && (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <label className="flex flex-col gap-1 text-xs font-normal text-zinc-500">
                  Quantidade
                  <input
                    type="number"
                    min={1}
                    max={NAME_POOL.length}
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className={`${inputCls} w-28`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setNames(generateNames(genCount).join("\n"))}
                  className="h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  Gerar nomes
                </button>
                <span className="text-xs font-normal text-zinc-500">
                  até {NAME_POOL.length} nomes distintos, sem repetir
                </span>
              </div>
            )}

            <textarea
              name="names"
              rows={8}
              value={names}
              onChange={(e) => setNames(e.target.value)}
              placeholder={
                nameMode === "manual"
                  ? "Digite um nome por linha…\nJoão\nMaria\nPedro"
                  : "Clique em “Gerar nomes” — a lista aparece aqui e pode ser editada…"
              }
              className="rounded-lg border border-zinc-300 bg-transparent p-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
            />
            <div className="flex items-center justify-between text-xs font-normal text-zinc-500">
              <span>{nameCount} nome(s) — um por linha, editável antes de criar</span>
              {names && (
                <button
                  type="button"
                  onClick={() => setNames("")}
                  className="hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>
            <FieldError state={state} name="names" />
          </div>
        )}

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Valor de cada {type === "numbers" ? "número" : "nome"} (opcional)
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">R$</span>
            <input
              name="slotPrice"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              className={`${inputCls} w-40`}
            />
          </div>
        </label>

        <div className="flex flex-col gap-3 text-sm font-medium">
          Prêmios
          {prizes.map((prize, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              {/* Preview / botão de imagem */}
              <div className="flex flex-col items-center gap-1">
                <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                  {prize.imageUrl ? (
                    <Image
                      src={prize.imageUrl}
                      alt={`Imagem do ${i + 1}º prêmio`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                      {prize.uploading ? "Enviando…" : "sem imagem"}
                    </span>
                  )}
                </div>
                <label className="cursor-pointer text-[11px] font-normal text-zinc-600 hover:underline dark:text-zinc-400">
                  {prize.imageUrl ? "Trocar" : "Adicionar imagem"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={prize.uploading}
                    onChange={(e) => handlePrizeFile(i, e.target.files?.[0])}
                  />
                </label>
                {prize.imageUrl && (
                  <button
                    type="button"
                    onClick={() => patchPrize(i, { imageUrl: "" })}
                    className="text-[11px] font-normal text-red-600 hover:underline dark:text-red-400"
                  >
                    Remover img
                  </button>
                )}
              </div>

              {/* Descrição + campo oculto com a URL da imagem */}
              <div className="flex flex-1 flex-col gap-2">
                <input
                  name="prizes"
                  value={prize.description}
                  onChange={(e) => patchPrize(i, { description: e.target.value })}
                  placeholder={`${i + 1}º prêmio`}
                  className={inputCls}
                />
                <input type="hidden" name="prizeImages" value={prize.imageUrl} />
                {prizes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPrizes(prizes.filter((_, j) => j !== i))}
                    className="self-start text-xs font-normal text-zinc-500 hover:underline"
                  >
                    Remover prêmio
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPrizes([...prizes, { description: "", imageUrl: "" }])}
            className="self-start text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            + Adicionar prêmio
          </button>
          <FieldError state={state} name="prizes" />
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Data do sorteio (opcional)
          <input name="drawDate" type="datetime-local" className={inputCls} />
          <span className="text-xs font-normal text-zinc-500">
            Deixe em branco para a rifa encerrar automaticamente quando todos os
            números/nomes forem vendidos.
          </span>
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
