"use client";

import { useMemo, useState } from "react";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const labelFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Datepicker de calendário (sem dependências). Grava o valor num input oculto
 * `name` no formato "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm" (compatível com o cast
 * ::timestamptz usado no servidor).
 */
export function DatePicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string | null;
}) {
  const initial = defaultValue ? new Date(defaultValue) : null;
  const initialValid = initial && !Number.isNaN(initial.getTime()) ? initial : null;

  const [selected, setSelected] = useState<Date | null>(initialValid);
  const [time, setTime] = useState<string>(
    initialValid && (initialValid.getHours() || initialValid.getMinutes())
      ? `${pad(initialValid.getHours())}:${pad(initialValid.getMinutes())}`
      : "",
  );
  const [open, setOpen] = useState(false);
  const base = initialValid ?? new Date();
  const [view, setView] = useState({ year: base.getFullYear(), month: base.getMonth() });

  const hiddenValue = useMemo(() => {
    if (!selected) return "";
    const d = `${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}`;
    return time ? `${d}T${time}` : d;
  }, [selected, time]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(view.year, view.month, 1).getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [view]);

  function shiftMonth(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  function isSelected(day: number) {
    return (
      selected != null &&
      selected.getFullYear() === view.year &&
      selected.getMonth() === view.month &&
      selected.getDate() === day
    );
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={hiddenValue} />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-11 flex-1 items-center justify-between rounded-lg border border-zinc-300 bg-transparent px-3 text-left text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
        >
          <span className={selected ? "" : "text-zinc-400"}>
            {selected ? labelFmt.format(selected) : "Selecionar data"}
            {selected && time ? ` às ${time}` : ""}
          </span>
          <span aria-hidden>📅</span>
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setTime("");
            }}
            className="h-11 rounded-lg border border-zinc-300 px-3 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Limpar
          </button>
        )}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-md px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                ‹
              </button>
              <span className="text-sm font-medium capitalize">
                {monthFmt.format(new Date(view.year, view.month, 1))}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-md px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                ›
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-400">
              {WEEKDAYS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) =>
                day == null ? (
                  <span key={`e${i}`} />
                ) : (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setSelected(new Date(view.year, view.month, day));
                      setOpen(false);
                    }}
                    className={`h-8 rounded-md text-sm transition-colors ${
                      isSelected(day)
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {day}
                  </button>
                ),
              )}
            </div>

            <label className="mt-3 flex items-center justify-between gap-2 text-xs text-zinc-500">
              Horário (opcional)
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 rounded-lg border border-zinc-300 bg-transparent px-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}
