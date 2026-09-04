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

const amountModeSchema = z.enum(["fixed", "percentageOfRevenue"])

export const fixedExpenseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1, "Nome obrigatório.").max(120),
    amount: z.number().min(0, "Valor não pode ser negativo."),
    amountMode: amountModeSchema.optional(),
    revenuePercentage: z.number().min(0).max(100).optional(),
    startMonth: monthKeySchema.optional(),
    endMonth: monthKeySchema.optional(),
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

    if (cost.amountMode !== "percentageOfRevenue" && cost.amount <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Valor deve ser maior que zero."
      })
    }

    if (cost.amountMode === "percentageOfRevenue" && !cost.revenuePercentage) {
      ctx.addIssue({
        code: "custom",
        path: ["revenuePercentage"],
        message: "Informe o percentual da receita."
      })
    }
  })

export const fixedExpenseFormSchema = z
  .object({
    name: z.string().trim().min(1, "Nome obrigatório.").max(120),
    amount: z.string().default(""),
    amountMode: amountModeSchema.default("fixed"),
    revenuePercentage: z.string().default(""),
    categoryId: z.string().min(1, "Categoria obrigatória."),
    subcategoryId: z.string().min(1, "Subcategoria obrigatória."),
    dueDay: optionalDayInputSchema,
    dueOffsetMonths: dueOffsetInputSchema,
    chargeDay: optionalDayInputSchema,
    paymentMethod: paymentMethodSchema,
    cardId: z.string().default("")
  })
  .transform((cost) => ({
    ...cost,
    amount: parseCurrencyInput(cost.amount || "0"),
    revenuePercentage: Number(cost.revenuePercentage.replace(",", ".")) || 0
  }))
  .superRefine((cost, ctx) => {
    if (cost.paymentMethod === "credit" && !cost.cardId) {
      ctx.addIssue({
        code: "custom",
        path: ["cardId"],
        message: "Gastos no crédito exigem um cartão."
      })
    }

    if (cost.amountMode === "fixed" && cost.amount <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Valor deve ser maior que zero."
      })
    }

    if (cost.amountMode === "percentageOfRevenue" && cost.revenuePercentage <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["revenuePercentage"],
        message: "Informe o percentual da receita."
      })
    }
  })
