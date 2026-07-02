"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  markSlot,
  editSlot,
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

      <div className="grid grid-cols-[repeat(auto-fill,minmax(1.75rem,1fr))] gap-1 sm:grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] sm:gap-1.5">
        {filtered.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => setSelected(slot)}
            title={
              slot.status === "taken"
                ? `${slot.label} — ${slot.buyer_name ?? ""}`
                : `${slot.label} — disponível`
            }
            className={`flex h-7 items-center justify-center rounded-md border px-0.5 text-center text-[10px] font-medium transition-colors sm:h-9 sm:text-xs ${
              slot.status === "taken"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-zinc-300 hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-300"
            }`}
          >
            <span className="w-full truncate">{slot.label}</span>
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

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 flex-1 rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
    >
      {pending ? "Salvando…" : label}
    </button>
  );
}

const dialogInputCls =
  "h-11 rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300";

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
  const [editState, editAction] = useActionState<MarkSlotState, FormData>(
    editSlot,
    undefined,
  );

  useEffect(() => {
    if (state?.ok || editState?.ok) onClose();
  }, [state, editState, onClose]);

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
            {slot.status === "taken" ? "Editar" : "Marcar"}: {slot.label}
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
            <form action={editAction} className="flex flex-col gap-3">
              <input type="hidden" name="slotId" value={slot.id} />
              <input type="hidden" name="raffleId" value={raffleId} />
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Nome do comprador
                <input
                  name="buyerName"
                  required
                  defaultValue={slot.buyer_name ?? ""}
                  className={dialogInputCls}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Telefone
                <input
                  name="buyerPhone"
                  required
                  inputMode="tel"
                  defaultValue={slot.buyer_phone ?? ""}
                  className={dialogInputCls}
                />
              </label>

              {editState?.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                  {editState.error}
                </p>
              )}

              <SubmitBtn label="Salvar alterações" />
            </form>

            <form
              action={unmarkSlot}
              onSubmit={(e) => {
                if (!confirm(`Liberar o ${slot.label}? Os dados do comprador serão apagados.`)) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="slotId" value={slot.id} />
              <input type="hidden" name="raffleId" value={raffleId} />
              <button
                type="submit"
                className="h-11 w-full rounded-lg border border-red-300 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Remover / liberar {slot.label}
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
              <SubmitBtn label="Marcar" />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
