import { z } from "zod"
import { paymentMethodSchema } from "./transaction"
import { parseCurrencyInput } from "../utils/currency-input"

const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido.")
const daySchema = z.number().int().min(1).max(31)
const optionalDayInputSchema = z
  .string()
  .transform((value) => (value ? Number(value) : undefined))
  .pipe(daySchema.optional())
const dueOffsetInputSchema = z
  .string()
  .transform((value) => Number(value || 0))
  .pipe(z.number().int().min(0).max(1))
const integerInputSchema = z
  .string()
  .min(1, "Informe a quantidade.")
  .transform(Number)
  .pipe(z.number().int())

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

export const installmentFormSchema = z
  .object({
    name: z.string().trim().min(1, "Nome obrigatório.").max(120),
    value: z
      .string()
      .min(1, "Informe o valor.")
      .refine((value) => parseCurrencyInput(value) > 0, "Parcela deve ser maior que zero.")
      .transform(parseCurrencyInput),
    total: integerInputSchema.pipe(z.number().min(1).max(999)),
    paid: z
      .string()
      .default("0")
      .transform((value) => Number(value || 0))
      .pipe(z.number().int().min(0).max(999)),
    paymentMethod: paymentMethodSchema,
    cardId: z.string().default(""),
    chargeDay: optionalDayInputSchema,
    dueOffsetMonths: dueOffsetInputSchema,
    startMonth: monthKeySchema
  })
  .superRefine((plan, ctx) => {
    if (plan.paid >= plan.total) {
      ctx.addIssue({
        code: "custom",
        path: ["paid"],
        message: "Parcelas pagas deve ser menor que o total."
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
