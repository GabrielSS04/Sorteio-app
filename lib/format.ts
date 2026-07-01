const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFmt.format(d);
}

/**
 * Rótulo da data do sorteio. Sem data definida, a rifa termina quando todos os
 * números/nomes forem vendidos.
 */
export function drawDateLabel(value: string | Date | null | undefined): string {
  if (!value) return "Ao vender todos";
  return formatDate(value);
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata um valor em reais. Aceita number, string (numeric do pg) ou null. */
export function formatPrice(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return null;
  return brl.format(n);
}

/** Rótulo da promoção em combo, ex.: "4 por R$ 15,00". Null se não houver. */
export function formatPromo(
  qty: number | string | null | undefined,
  price: number | string | null | undefined,
): string | null {
  const n = qty == null || qty === "" ? null : Number(qty);
  const p = formatPrice(price);
  if (!n || Number.isNaN(n) || !p) return null;
  return `${n} por ${p}`;
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  open: "Aberto",
  drawn: "Sorteado",
  closed: "Encerrado",
};

export const TYPE_LABEL: Record<string, string> = {
  numbers: "Números",
  names: "Nomes",
};
