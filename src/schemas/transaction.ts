import { z } from "zod"

const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido.")
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
const isoDateTimeSchema = z.string().datetime({ offset: true })

export const paymentMethodSchema = z.enum([
  "cash",
  "debit",
  "pix",
  "bank-transfer",
  "bank-slip",
  "cash-money",
  "credit"
])

export const transactionSchema = z
  .object({
    id: z.string().min(1),
    createdAt: isoDateTimeSchema.optional(),
    label: z.string().trim().min(1, "Descrição obrigatória.").max(120),
    value: z.number().positive("Informe um valor maior que zero."),
    date: isoDateSchema,
    type: z.union([z.literal(1), z.literal(2)]),
    paymentMethod: paymentMethodSchema,
    cardId: z.string().min(1).optional(),
    categoryId: z.string().min(1, "Categoria obrigatória."),
    subcategoryId: z.string().min(1, "Subcategoria obrigatória."),
    tags: z.array(z.string().trim().min(1)).default([]),
    competenceMonth: monthKeySchema.optional()
  })
  .superRefine((transaction, ctx) => {
    if (transaction.type === 1 && transaction.paymentMethod === "credit") {
      ctx.addIssue({
        code: "custom",
        path: ["paymentMethod"],
        message: "Entradas não podem usar cartão de crédito."
      })
    }

    if (
      transaction.type === 2 &&
      transaction.paymentMethod === "credit" &&
      !transaction.cardId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["cardId"],
        message: "Selecione um cartão para despesas no crédito."
      })
    }
  })

export const transactionFormSchema = z.object({
  label: z.string().max(120).default(""),
  amountCents: z.number().int().positive("Informe um valor maior que zero."),
  date: isoDateSchema,
  type: z.union([z.literal(1), z.literal(2)]),
  paymentMethod: paymentMethodSchema,
  cardId: z.string().default(""),
  categoryId: z.string().min(1, "Categoria obrigatória."),
  subcategoryId: z.string().min(1, "Subcategoria obrigatória."),
  tagsInput: z.string().default(""),
  competenceMonth: z.union([monthKeySchema, z.literal("")]).default("")
})

export type TransactionFormValues = z.infer<typeof transactionFormSchema>
