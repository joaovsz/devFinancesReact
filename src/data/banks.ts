export type BankPreset = {
  id: string
  name: string
  brandColor: string
  domain?: string
  logoUrl?: string
  ispb?: string
}

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function buildBankLogoUrl(domain?: string, bankName?: string) {
  if (domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
  }

  if (bankName) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      bankName
    )}&background=ffffff&color=111111&bold=true&size=128&format=png&rounded=true`
  }

  return undefined
}

export function findBankPresetByIdOrName(bankId?: string, bankName?: string) {
  const idSlug = bankId ? toSlug(bankId) : ""
  const nameSlug = bankName ? toSlug(bankName) : ""

  return bankPresets.find((bank) => {
    const bankIdSlug = toSlug(bank.id)
    const bankNameSlug = toSlug(bank.name)
    return (
      (idSlug && bankIdSlug === idSlug) ||
      (nameSlug && (bankNameSlug === nameSlug || nameSlug.includes(bankNameSlug)))
    )
  })
}

export function resolveBankBranding(bank?: Partial<BankPreset>) {
  const preset = findBankPresetByIdOrName(bank?.id, bank?.name)
  const name = bank?.name || preset?.name || "Banco"
  return {
    bankId: bank?.id || preset?.id,
    name,
    brandColor: bank?.brandColor || preset?.brandColor || "#10B981",
    logoUrl:
      bank?.logoUrl || preset?.logoUrl || buildBankLogoUrl(bank?.domain || preset?.domain, name)
  }
}

export const bankPresets: BankPreset[] = [
  {
    id: "nubank",
    name: "Nubank",
    brandColor: "#820AD1",
    domain: "nubank.com.br",
    logoUrl: buildBankLogoUrl("nubank.com.br", "Nubank")
  },
  {
    id: "ourocard",
    name: "Ourocard",
    brandColor: "#FFCD00",
    domain: "bb.com.br",
    logoUrl: buildBankLogoUrl("bb.com.br", "Ourocard")
  },
  {
    id: "banco-do-brasil",
    name: "Banco do Brasil",
    brandColor: "#0033A0",
    domain: "bb.com.br",
    logoUrl: buildBankLogoUrl("bb.com.br", "Banco do Brasil")
  },
  {
    id: "mercado-pago",
    name: "Mercado Pago",
    brandColor: "#009EE3",
    domain: "mercadopago.com.br",
    logoUrl: buildBankLogoUrl("mercadopago.com.br", "Mercado Pago")
  },
  {
    id: "credicard",
    name: "Credicard",
    brandColor: "#00AEEF",
    domain: "credicard.com.br",
    logoUrl: buildBankLogoUrl("credicard.com.br", "Credicard")
  },
  {
    id: "itau",
    name: "Itaú",
    brandColor: "#005183",
    domain: "itau.com.br",
    logoUrl: buildBankLogoUrl("itau.com.br", "Itaú")
  },
  {
    id: "bradesco",
    name: "Bradesco",
    brandColor: "#CC092F",
    domain: "bradesco.com.br",
    logoUrl: buildBankLogoUrl("bradesco.com.br", "Bradesco")
  },
  {
    id: "santander",
    name: "Santander",
    brandColor: "#EA1D25",
    domain: "santander.com.br",
    logoUrl: buildBankLogoUrl("santander.com.br", "Santander")
  },
  {
    id: "caixa",
    name: "Caixa",
    brandColor: "#005CA9",
    domain: "caixa.gov.br",
    logoUrl: buildBankLogoUrl("caixa.gov.br", "Caixa")
  },
  {
    id: "inter",
    name: "Inter",
    brandColor: "#FF7A00",
    domain: "inter.co",
    logoUrl: buildBankLogoUrl("inter.co", "Inter")
  },
  {
    id: "c6-bank",
    name: "C6 Bank",
    brandColor: "#111111",
    domain: "c6bank.com.br",
    logoUrl: buildBankLogoUrl("c6bank.com.br", "C6 Bank")
  },
  {
    id: "picpay",
    name: "PicPay",
    brandColor: "#21C25E",
    domain: "picpay.com",
    logoUrl: buildBankLogoUrl("picpay.com", "PicPay")
  }
]
