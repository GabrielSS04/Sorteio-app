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
