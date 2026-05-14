import { describe, expect, it } from "vitest"
import {
  creditCardFormSchema,
  fixedExpenseFormSchema,
  installmentFormSchema,
  transactionFormSchema
} from "./index"

describe("zod form validation", () => {
  it("accepts valid transaction form values used by the quick entry flow", () => {
    const parsed = transactionFormSchema.safeParse({
      label: "",
      amountCents: 12500,
      date: "2026-05-14",
      type: 2,
      paymentMethod: "credit",
      cardId: "card-1",
      categoryId: "alimentacao",
      subcategoryId: "mercado",
      tagsInput: "casa, mercado",
      competenceMonth: ""
    })

    expect(parsed.success).toBe(true)
  })

  it("accepts valid credit card form values and normalizes currency and days", () => {
    const parsed = creditCardFormSchema.safeParse({
      limit: "R$ 5.000,00",
      closeDay: "26",
      dueDay: "5"
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data).toEqual({
        limit: 5000,
        closeDay: 26,
        dueDay: 5
      })
    }
  })

  it("accepts valid fixed expense form values for cash and credit flows", () => {
    const cash = fixedExpenseFormSchema.safeParse({
      name: "Aluguel",
      amount: "R$ 2.100,00",
      categoryId: "moradia",
      subcategoryId: "aluguel",
      dueDay: "5",
      dueOffsetMonths: "1",
      chargeDay: "",
      paymentMethod: "pix",
      cardId: ""
    })
    const credit = fixedExpenseFormSchema.safeParse({
      name: "Streaming",
      amount: "R$ 59,90",
      categoryId: "lazer-assinaturas",
      subcategoryId: "streaming",
      dueDay: "",
      dueOffsetMonths: "0",
      chargeDay: "15",
      paymentMethod: "credit",
      cardId: "card-1"
    })

    expect(cash.success).toBe(true)
    expect(credit.success).toBe(true)
    if (cash.success && credit.success) {
      expect(cash.data.amount).toBe(2100)
      expect(cash.data.dueDay).toBe(5)
      expect(cash.data.dueOffsetMonths).toBe(1)
      expect(credit.data.amount).toBe(59.9)
      expect(credit.data.chargeDay).toBe(15)
    }
  })

  it("accepts valid installment form values and normalizes numeric fields", () => {
    const parsed = installmentFormSchema.safeParse({
      name: "Notebook",
      value: "R$ 650,00",
      total: "10",
      paid: "3",
      paymentMethod: "credit",
      cardId: "card-1",
      chargeDay: "20",
      dueOffsetMonths: "0",
      startMonth: "2026-05"
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data).toMatchObject({
        value: 650,
        total: 10,
        paid: 3,
        chargeDay: 20
      })
    }
  })

  it("rejects invalid form values with controlled zod errors", () => {
    const missingCard = fixedExpenseFormSchema.safeParse({
      name: "Streaming",
      amount: "R$ 59,90",
      categoryId: "lazer-assinaturas",
      subcategoryId: "streaming",
      dueDay: "",
      dueOffsetMonths: "0",
      chargeDay: "15",
      paymentMethod: "credit",
      cardId: ""
    })
    const invalidInstallment = installmentFormSchema.safeParse({
      name: "Notebook",
      value: "R$ 650,00",
      total: "3",
      paid: "3",
      paymentMethod: "pix",
      cardId: "",
      chargeDay: "10",
      dueOffsetMonths: "0",
      startMonth: "2026-05"
    })

    expect(missingCard.success).toBe(false)
    expect(invalidInstallment.success).toBe(false)
    if (!missingCard.success && !invalidInstallment.success) {
      expect(missingCard.error.issues[0]?.message).toBe(
        "Gastos no crédito exigem um cartão."
      )
      expect(invalidInstallment.error.issues[0]?.message).toBe(
        "Parcelas pagas deve ser menor que o total."
      )
    }
  })
})
