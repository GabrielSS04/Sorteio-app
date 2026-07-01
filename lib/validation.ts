import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Informe o usuário."),
  password: z.string().min(1, "Informe a senha."),
});

export const raffleTypeSchema = z.enum(["numbers", "names"]);

/**
 * Criação de sorteio.
 * - `numbers`: os slots são 1..totalSlots (gerados automaticamente).
 * - `names`: o admin informa a lista de nomes (um por linha); a quantidade
 *   de slots passa a ser o tamanho dessa lista.
 */
export const createRaffleSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título.").max(200),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    type: raffleTypeSchema,
    totalSlots: z.coerce.number().int().positive().max(100000).optional(),
    slotPrice: z.coerce.number().nonnegative().max(1000000).optional(),
    drawDate: z.string().trim().optional().or(z.literal("")),
    prizes: z
      .array(
        z.object({
          description: z.string().trim().min(1),
          imageUrl: z.string().url().max(2048).optional().or(z.literal("")),
        }),
      )
      .min(1, "Informe ao menos um prêmio."),
    names: z.array(z.string().trim().min(1)).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "numbers") {
      if (!data.totalSlots || data.totalSlots < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["totalSlots"],
          message: "Informe a quantidade de números.",
        });
      }
    } else {
      if (!data.names || data.names.length < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["names"],
          message: "Informe ao menos um nome.",
        });
      }
      const unique = new Set((data.names ?? []).map((n) => n.toLowerCase()));
      if (data.names && unique.size !== data.names.length) {
        ctx.addIssue({
          code: "custom",
          path: ["names"],
          message: "Há nomes repetidos na lista.",
        });
      }
    }
  });

export const markSlotSchema = z.object({
  slotId: z.string().uuid("Slot inválido."),
  raffleId: z.string().uuid("Sorteio inválido."),
  buyerName: z.string().trim().min(1, "Informe o nome do comprador.").max(200),
  buyerPhone: z
    .string()
    .trim()
    .min(8, "Informe um telefone válido.")
    .max(30),
});
