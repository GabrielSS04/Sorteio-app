"use client";

import { useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";

export type PrizeInput = { description: string; imageUrl: string; uploading?: boolean };

const inputCls =
  "h-11 rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300";

/**
 * Lista de prêmios com upload de imagem (Vercel Blob). Emite, por linha,
 * um input `prizes` (descrição) e um `prizeImages` (URL) — arrays paralelos
 * lidos por índice no servidor.
 */
export function PrizesField({
  defaultPrizes,
  error,
}: {
  defaultPrizes?: PrizeInput[];
  error?: string;
}) {
  const [prizes, setPrizes] = useState<PrizeInput[]>(
    defaultPrizes && defaultPrizes.length > 0
      ? defaultPrizes
      : [{ description: "", imageUrl: "" }],
  );

  function patch(i: number, p: Partial<PrizeInput>) {
    setPrizes((prev) => prev.map((row, j) => (j === i ? { ...row, ...p } : row)));
  }

  async function handleFile(i: number, file: File | undefined) {
    if (!file) return;
    patch(i, { uploading: true });
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/prize-upload",
      });
      patch(i, { imageUrl: blob.url, uploading: false });
    } catch (err) {
      patch(i, { uploading: false });
      alert(
        "Falha no upload da imagem: " +
          (err instanceof Error ? err.message : "erro desconhecido"),
      );
    }
  }

  return (
    <div className="flex flex-col gap-3 text-sm font-medium">
      Prêmios
      {prizes.map((prize, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
        >
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
                onChange={(e) => handleFile(i, e.target.files?.[0])}
              />
            </label>
            {prize.imageUrl && (
              <button
                type="button"
                onClick={() => patch(i, { imageUrl: "" })}
                className="text-[11px] font-normal text-red-600 hover:underline dark:text-red-400"
              >
                Remover img
              </button>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <input
              name="prizes"
              value={prize.description}
              onChange={(e) => patch(i, { description: e.target.value })}
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
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
