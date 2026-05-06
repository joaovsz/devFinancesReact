import { z } from "zod"
import { paymentMethodSchema } from "./transaction"

const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido.")
const daySchema = z.number().int().min(1).max(31)

export const fixedExpenseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1, "Nome obrigatório.").max(120),
    amount: z.number().positive("Valor deve ser maior que zero."),
    startMonth: monthKeySchema.optional(),
    dueOffsetMonths: z.number().int().min(0).max(1).optional(),
    dueDay: daySchema.optional(),
    chargeDay: daySchema.optional(),
    categoryId: z.string().min(1),
    subcategoryId: z.string().min(1),
    paymentMethod: paymentMethodSchema,
    cardId: z.string().min(1).optional()
  })
  .superRefine((cost, ctx) => {
    if (cost.paymentMethod === "credit" && !cost.cardId) {
      ctx.addIssue({
        code: "custom",
        path: ["cardId"],
        message: "Gastos no crédito exigem um cartão."
      })
    }
  })
