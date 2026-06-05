import { z } from "zod"
import { parseCurrencyInput } from "../../../utils/currency-input"

const nullableText = z.string().trim().optional().transform((value) => value || null)
const optionalUrl = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^https?:\/\/.+/i.test(value), "URL inválida")
  .transform((value) => value || null)
const moneyInput = z
  .string()
  .default("")
  .transform(parseCurrencyInput)
  .pipe(z.number().min(0, "Valor não pode ser negativo."))
const positiveMoneyInput = z
  .string()
  .default("")
  .transform(parseCurrencyInput)
  .pipe(z.number().positive("Valor deve ser maior que zero."))
const positiveIntegerInput = z
  .string()
  .min(1, "Quantidade obrigatória.")
  .transform(Number)
  .pipe(z.number().int().positive("Quantidade deve ser maior que zero."))

export const marketplaceSchema = z.enum([
  "mercado_livre",
  "shopee",
  "olx",
  "instagram",
  "direct",
  "other"
])

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório."),
  brand: nullableText,
  model: nullableText,
  sku: z.string().trim().min(1, "SKU é obrigatório."),
  category: nullableText,
  supplierUrl: optionalUrl,
  imageUrl: optionalUrl,
  notes: nullableText,
  isActive: z.boolean().default(true)
})

export const purchaseLotFormSchema = z.object({
  productId: z.string().min(1, "Produto obrigatório."),
  quantity: positiveIntegerInput,
  productCostTotal: moneyInput,
  internationalShippingTotal: moneyInput,
  taxTotal: moneyInput,
  packagingTotal: moneyInput,
  otherCostsTotal: moneyInput,
  dollarRate: z
    .string()
    .default("")
    .transform((value) => (value ? Number(value.replace(",", ".")) : null))
    .pipe(z.number().min(0).nullable()),
  supplierName: nullableText,
  supplierOrderCode: nullableText,
  purchasedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data da compra obrigatória.")
})

export const saleFormSchema = z.object({
  productId: z.string().min(1, "Produto obrigatório."),
  purchaseLotId: z.string().min(1, "Lote obrigatório."),
  marketplace: marketplaceSchema,
  quantity: positiveIntegerInput,
  salePrice: positiveMoneyInput,
  marketplaceFee: moneyInput,
  shippingCost: moneyInput,
  packagingCost: moneyInput,
  otherCosts: moneyInput,
  soldAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data da venda obrigatória."),
  notes: nullableText
})

export const pricingSimulatorSchema = z.object({
  purchaseLotId: z.string().min(1, "Lote obrigatório."),
  marketplace: marketplaceSchema,
  quantity: positiveIntegerInput,
  salePrice: positiveMoneyInput,
  feePercent: z
    .string()
    .default("0")
    .transform((value) => Number(value.replace(",", ".") || 0))
    .pipe(z.number().min(0)),
  fixedFee: moneyInput,
  shippingCost: moneyInput,
  packagingCost: moneyInput,
  otherCosts: moneyInput,
  desiredMarginPercent: z
    .string()
    .default("20")
    .transform((value) => Number(value.replace(",", ".") || 0))
    .pipe(z.number().min(0).max(95))
})

export type ProductFormData = z.input<typeof productFormSchema>
export type PurchaseLotFormData = z.input<typeof purchaseLotFormSchema>
export type SaleFormData = z.input<typeof saleFormSchema>
export type PricingSimulatorData = z.input<typeof pricingSimulatorSchema>
