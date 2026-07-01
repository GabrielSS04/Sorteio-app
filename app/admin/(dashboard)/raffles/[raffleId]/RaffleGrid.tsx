"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  markSlot,
  unmarkSlot,
  type MarkSlotState,
} from "@/app/actions/raffles";

export type Slot = {
  id: string;
  position: number;
  label: string;
  status: "available" | "taken";
  buyer_name: string | null;
  buyer_phone: string | null;
};

export function RaffleGrid({ raffleId, slots }: { raffleId: string; slots: Slot[] }) {
  const [selected, setSelected] = useState<Slot | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return slots;
    return slots.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        (s.buyer_name ?? "").toLowerCase().includes(q),
    );
  }, [slots, query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filtrar por número/nome ou comprador…"
        className="mb-4 h-10 w-full max-w-sm rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
      />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
        {filtered.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => setSelected(slot)}
            title={slot.status === "taken" ? `${slot.buyer_name}` : "Disponível"}
            className={`flex h-14 flex-col items-center justify-center rounded-lg border px-1 text-center text-sm transition-colors ${
              slot.status === "taken"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-zinc-300 hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-300"
            }`}
          >
            <span className="w-full truncate font-medium">{slot.label}</span>
            {slot.status === "taken" && slot.buyer_name && (
              <span className="w-full truncate text-[10px] opacity-70">
                {slot.buyer_name}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-500">Nenhum resultado.</p>
      )}

      {selected && (
        <SlotDialog
          raffleId={raffleId}
          slot={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function MarkButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 flex-1 rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
    >
      {pending ? "Salvando…" : "Marcar"}
    </button>
  );
}

function SlotDialog({
  raffleId,
  slot,
  onClose,
}: {
  raffleId: string;
  slot: Slot;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<MarkSlotState, FormData>(markSlot, undefined);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {slot.status === "taken" ? "Marcado" : "Marcar"}: {slot.label}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {slot.status === "taken" ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p>
                <span className="text-zinc-500">Comprador:</span> {slot.buyer_name}
              </p>
              <p>
                <span className="text-zinc-500">Telefone:</span> {slot.buyer_phone}
              </p>
            </div>
            <form action={unmarkSlot}>
              <input type="hidden" name="slotId" value={slot.id} />
              <input type="hidden" name="raffleId" value={raffleId} />
              <button
                type="submit"
                className="h-11 w-full rounded-lg border border-red-300 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Desmarcar
              </button>
            </form>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="slotId" value={slot.id} />
            <input type="hidden" name="raffleId" value={raffleId} />
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Nome do comprador
              <input
                name="buyerName"
                required
                autoFocus
                className="h-11 rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Telefone
              <input
                name="buyerPhone"
                required
                inputMode="tel"
                placeholder="(00) 00000-0000"
                className="h-11 rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
              />
            </label>

            {state?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                {state.error}
              </p>
            )}

            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 rounded-lg border border-zinc-300 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Cancelar
              </button>
              <MarkButton />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
