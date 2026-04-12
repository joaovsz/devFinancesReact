export type BankPreset = {
  id: string
  name: string
  brandColor: string
}

export const bankPresets: BankPreset[] = [
  { id: "nubank", name: "Nubank", brandColor: "#820AD1" },
  { id: "ourocard", name: "Ourocard", brandColor: "#FFCD00" },
  { id: "banco-do-brasil", name: "Banco do Brasil", brandColor: "#0033A0" },
  { id: "mercado-pago", name: "Mercado Pago", brandColor: "#009EE3" },
  { id: "credicard", name: "Credicard", brandColor: "#00AEEF" },
  { id: "itau", name: "Itaú", brandColor: "#005183" },
  { id: "bradesco", name: "Bradesco", brandColor: "#CC092F" },
  { id: "santander", name: "Santander", brandColor: "#EA1D25" },
  { id: "caixa", name: "Caixa", brandColor: "#005CA9" },
  { id: "inter", name: "Inter", brandColor: "#FF7A00" },
  { id: "c6-bank", name: "C6 Bank", brandColor: "#111111" },
  { id: "picpay", name: "PicPay", brandColor: "#21C25E" }
]
