export type BankPreset = {
  id: string
  name: string
  brandColor: string
  domain?: string
  logoUrl?: string
  ispb?: string
  aliases?: string[]
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

  if (idSlug) {
    const match = bankPresets.find((bank) => toSlug(bank.id) === idSlug)
    if (match) return match
  }

  if (nameSlug) {
    // 1. Exact match by name or alias
    const exactMatch = bankPresets.find(
      (bank) =>
        toSlug(bank.name) === nameSlug ||
        bank.aliases?.some((alias) => toSlug(alias) === nameSlug)
    )
    if (exactMatch) return exactMatch

    // 2. Partial match (longest preset/alias first to avoid short prefix collisions)
    const matches = bankPresets.filter((bank) => {
      const bankSlug = toSlug(bank.name)
      if (nameSlug.includes(bankSlug) || bankSlug.includes(nameSlug)) return true
      return bank.aliases?.some(
        (alias) => nameSlug.includes(toSlug(alias)) || toSlug(alias).includes(nameSlug)
      )
    })

    if (matches.length > 0) {
      matches.sort((a, b) => b.name.length - a.name.length)
      return matches[0]
    }
  }

  return undefined
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
    id: "azul-itau",
    name: "Azul Itaú",
    brandColor: "#002C6C",
    domain: "voeazul.com.br",
    logoUrl: buildBankLogoUrl("voeazul.com.br", "Azul"),
    aliases: ["azul", "tudoazul", "azul itau", "azul platinum", "cartao azul", "voeazul"]
  },
  {
    id: "itau",
    name: "Itaú",
    brandColor: "#EC7000",
    domain: "itau.com.br",
    logoUrl: buildBankLogoUrl("itau.com.br", "Itaú"),
    aliases: ["itau", "itaucard", "itau unibanco", "itau personalite", "itau click"]
  },
  {
    id: "latam-pass-itau",
    name: "LATAM Pass Itaú",
    brandColor: "#800020",
    domain: "latamairlines.com",
    logoUrl: buildBankLogoUrl("latamairlines.com", "LATAM Pass"),
    aliases: ["latam", "latam pass", "latam itau", "multiplus"]
  },
  {
    id: "nubank",
    name: "Nubank",
    brandColor: "#820AD1",
    domain: "nubank.com.br",
    logoUrl: buildBankLogoUrl("nubank.com.br", "Nubank"),
    aliases: ["nubank", "nu", "roxinho", "nu pagamentos"]
  },
  {
    id: "ourocard",
    name: "Ourocard",
    brandColor: "#FFCD00",
    domain: "bb.com.br",
    logoUrl: buildBankLogoUrl("bb.com.br", "Ourocard"),
    aliases: ["ourocard"]
  },
  {
    id: "banco-do-brasil",
    name: "Banco do Brasil",
    brandColor: "#0033A0",
    domain: "bb.com.br",
    logoUrl: buildBankLogoUrl("bb.com.br", "Banco do Brasil"),
    aliases: ["bb", "banco do brasil"]
  },
  {
    id: "inter",
    name: "Inter",
    brandColor: "#FF7A00",
    domain: "inter.co",
    logoUrl: buildBankLogoUrl("inter.co", "Inter"),
    aliases: ["banco inter", "inter"]
  },
  {
    id: "c6-bank",
    name: "C6 Bank",
    brandColor: "#111111",
    domain: "c6bank.com.br",
    logoUrl: buildBankLogoUrl("c6bank.com.br", "C6 Bank"),
    aliases: ["c6", "c6 bank"]
  },
  {
    id: "btg-pactual",
    name: "BTG Pactual",
    brandColor: "#001E62",
    domain: "btgpactual.com",
    logoUrl: buildBankLogoUrl("btgpactual.com", "BTG Pactual"),
    aliases: ["btg", "btg pactual"]
  },
  {
    id: "xp-investimentos",
    name: "XP Investimentos",
    brandColor: "#000000",
    domain: "xpi.com.br",
    logoUrl: buildBankLogoUrl("xpi.com.br", "XP"),
    aliases: ["xp", "xp investimentos"]
  },
  {
    id: "mercado-pago",
    name: "Mercado Pago",
    brandColor: "#009EE3",
    domain: "mercadopago.com.br",
    logoUrl: buildBankLogoUrl("mercadopago.com.br", "Mercado Pago"),
    aliases: ["mercado pago"]
  },
  {
    id: "credicard",
    name: "Credicard",
    brandColor: "#00AEEF",
    domain: "credicard.com.br",
    logoUrl: buildBankLogoUrl("credicard.com.br", "Credicard"),
    aliases: ["credicard"]
  },
  {
    id: "bradesco",
    name: "Bradesco",
    brandColor: "#CC092F",
    domain: "bradesco.com.br",
    logoUrl: buildBankLogoUrl("bradesco.com.br", "Bradesco"),
    aliases: ["bradesco"]
  },
  {
    id: "santander",
    name: "Santander",
    brandColor: "#EA1D25",
    domain: "santander.com.br",
    logoUrl: buildBankLogoUrl("santander.com.br", "Santander"),
    aliases: ["santander"]
  },
  {
    id: "caixa",
    name: "Caixa",
    brandColor: "#005CA9",
    domain: "caixa.gov.br",
    logoUrl: buildBankLogoUrl("caixa.gov.br", "Caixa"),
    aliases: ["caixa", "cef", "caixa economica"]
  },
  {
    id: "picpay",
    name: "PicPay",
    brandColor: "#21C25E",
    domain: "picpay.com",
    logoUrl: buildBankLogoUrl("picpay.com", "PicPay"),
    aliases: ["picpay"]
  }
]
