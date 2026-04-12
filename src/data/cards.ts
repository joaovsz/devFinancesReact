import { CreditCard } from "../types/card"

export const defaultCreditCards: CreditCard[] = [
  {
    id: "nubank",
    name: "Nubank",
    brandColor: "#820AD1",
    limitTotal: 4000,
    closeDay: 10,
    dueDay: 17,
    manualInvoiceAmount: 0
  },
  {
    id: "ourocard",
    name: "Ourocard",
    brandColor: "#FFCD00",
    limitTotal: 3500,
    closeDay: 8,
    dueDay: 15,
    manualInvoiceAmount: 0
  },
  {
    id: "credicard",
    name: "Credicard",
    brandColor: "#00AEEF",
    limitTotal: 3000,
    closeDay: 12,
    dueDay: 20,
    manualInvoiceAmount: 0
  },
  {
    id: "mercado-pago",
    name: "Mercado Pago",
    brandColor: "#009EE3",
    limitTotal: 2500,
    closeDay: 18,
    dueDay: 25,
    manualInvoiceAmount: 0
  }
]
