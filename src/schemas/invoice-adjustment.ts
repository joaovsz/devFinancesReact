import { z } from "zod"

export const invoiceAdjustmentSchema = z.object({
  cardId: z.string().min(1),
  monthKey: z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido."),
  amount: z.number().finite("Valor de ajuste inválido.")
})
