import { CreditCard } from "../types/card"

export const defaultCreditCards: CreditCard[] = [
  {
    id: "nubank",
    bankId: "nubank",
    name: "Nubank",
    brandColor: "#820AD1",
    logoUrl: "https://www.google.com/s2/favicons?domain=nubank.com.br&sz=128",
    limitTotal: 4000,
    closeDay: 10,
    dueDay: 17,
    manualInvoiceAmount: 0
  },
  {
    id: "ourocard",
    bankId: "ourocard",
    name: "Ourocard",
    brandColor: "#FFCD00",
    logoUrl: "https://www.google.com/s2/favicons?domain=bb.com.br&sz=128",
    limitTotal: 3500,
    closeDay: 8,
    dueDay: 15,
    manualInvoiceAmount: 0
  },
  {
    id: "credicard",
    bankId: "credicard",
    name: "Credicard",
    brandColor: "#00AEEF",
    logoUrl: "https://www.google.com/s2/favicons?domain=credicard.com.br&sz=128",
    limitTotal: 3000,
    closeDay: 12,
    dueDay: 20,
    manualInvoiceAmount: 0
  },
  {
    id: "mercado-pago",
    bankId: "mercado-pago",
    name: "Mercado Pago",
    brandColor: "#009EE3",
    logoUrl: "https://www.google.com/s2/favicons?domain=mercadopago.com.br&sz=128",
    limitTotal: 2500,
    closeDay: 18,
    dueDay: 25,
    manualInvoiceAmount: 0
  }
]
