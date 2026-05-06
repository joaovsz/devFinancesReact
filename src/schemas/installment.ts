import { z } from "zod"
import { paymentMethodSchema } from "./transaction"

const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido.")
const daySchema = z.number().int().min(1).max(31)

export const installmentSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1, "Nome obrigatório.").max(120),
    installmentValue: z.number().positive("Parcela deve ser maior que zero."),
    totalInstallments: z.number().int().min(1).max(999),
    paidInstallments: z.number().int().min(0).max(999),
    startMonth: monthKeySchema,
    dueOffsetMonths: z.number().int().min(0).max(1).optional(),
    chargeDay: daySchema.optional(),
    paymentMethod: paymentMethodSchema,
    cardId: z.string().min(1).optional()
  })
  .superRefine((plan, ctx) => {
    if (plan.paidInstallments > plan.totalInstallments) {
      ctx.addIssue({
        code: "custom",
        path: ["paidInstallments"],
        message: "Parcelas pagas não podem exceder o total."
      })
    }

    if (plan.paymentMethod === "credit" && !plan.cardId) {
      ctx.addIssue({
        code: "custom",
        path: ["cardId"],
        message: "Parcelamentos no crédito exigem um cartão."
      })
    }
  })
