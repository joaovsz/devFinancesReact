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

export const fixedExpenseFormSchema = z
  .object({
    name: z.string().trim().min(1, "Nome obrigatório.").max(120),
    amount: z
      .string()
      .min(1, "Informe o valor.")
      .refine((value) => parseCurrencyInput(value) > 0, "Valor deve ser maior que zero.")
      .transform(parseCurrencyInput),
    categoryId: z.string().min(1, "Categoria obrigatória."),
    subcategoryId: z.string().min(1, "Subcategoria obrigatória."),
    dueDay: optionalDayInputSchema,
    dueOffsetMonths: dueOffsetInputSchema,
    chargeDay: optionalDayInputSchema,
    paymentMethod: paymentMethodSchema,
    cardId: z.string().default("")
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
