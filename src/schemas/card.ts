import { z } from "zod"
import { parseCurrencyInput } from "../utils/currency-input"

const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido.")
const dayInputSchema = z
  .string()
  .min(1, "Selecione o dia.")
  .refine((value) => {
    const day = Number(value)
    return Number.isInteger(day) && day >= 1 && day <= 31
  }, "Dia inválido.")
  .transform(Number)

export const manualInvoiceByMonthSchema = z.record(
  monthKeySchema,
  z.number().finite("Valor de ajuste inválido.")
)

export const creditCardFormSchema = z.object({
  limit: z
    .string()
    .min(1, "Informe o limite.")
    .refine((value) => parseCurrencyInput(value) > 0, "Informe um limite maior que zero.")
    .transform(parseCurrencyInput),
  closeDay: dayInputSchema,
  dueDay: dayInputSchema
})

export const creditCardSchema = z.object({
  id: z.string().min(1),
  bankId: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Nome do cartão obrigatório.").max(80),
  brandColor: z.string().trim().min(1),
  logoUrl: z.string().url().optional(),
  limitTotal: z.number().nonnegative("Limite não pode ser negativo."),
  closeDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  manualInvoiceAmount: z.number().finite(),
  manualInvoiceByMonth: manualInvoiceByMonthSchema.optional(),
  paidThroughMonth: monthKeySchema.optional()
})

export type CreditCardFormValues = z.input<typeof creditCardFormSchema>
