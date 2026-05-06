import { z } from "zod"

const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido.")

export const manualInvoiceByMonthSchema = z.record(
  monthKeySchema,
  z.number().finite("Valor de ajuste inválido.")
)

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
