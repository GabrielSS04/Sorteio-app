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
const promoQuantitySchema = z.coerce.number().int().positive().max(100000).optional();
const promoPriceSchema = z.coerce.number().nonnegative().max(1000000).optional();

// Regra da promoção: quantidade e valor andam juntos; combo de 2+.
function refinePromo(
  data: { promoQuantity?: number; promoPrice?: number },
  ctx: z.RefinementCtx,
) {
  const hasQty = data.promoQuantity != null;
  const hasPrice = data.promoPrice != null;
  if (hasQty !== hasPrice) {
    ctx.addIssue({
      code: "custom",
      path: [hasQty ? "promoPrice" : "promoQuantity"],
      message: "Preencha a quantidade e o valor da promoção.",
    });
  }
  if (hasQty && (data.promoQuantity as number) < 2) {
    ctx.addIssue({
      code: "custom",
      path: ["promoQuantity"],
      message: "A promoção deve ser de 2 ou mais.",
    });
  }
}

export const createRaffleSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título.").max(200),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    type: raffleTypeSchema,
    totalSlots: z.coerce.number().int().positive().max(100000).optional(),
    slotPrice: z.coerce.number().nonnegative().max(1000000).optional(),
    promoQuantity: promoQuantitySchema,
    promoPrice: promoPriceSchema,
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
    refinePromo(data, ctx);
  });

// Edição da rifa: apenas as infos seguras (não mexe em tipo, quantidade nem
// nos próprios números/nomes, que já existem e podem estar vendidos).
export const updateRaffleSchema = z
  .object({
    raffleId: z.string().uuid("Rifa inválida."),
    title: z.string().trim().min(1, "Informe o título.").max(200),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    slotPrice: z.coerce.number().nonnegative().max(1000000).optional(),
    promoQuantity: promoQuantitySchema,
    promoPrice: promoPriceSchema,
    drawDate: z.string().trim().optional().or(z.literal("")),
    prizes: z
      .array(
        z.object({
          description: z.string().trim().min(1),
          imageUrl: z.string().url().max(2048).optional().or(z.literal("")),
        }),
      )
      .min(1, "Informe ao menos um prêmio."),
  })
  .superRefine(refinePromo);

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
