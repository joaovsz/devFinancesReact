import {
  bankPresets,
  BankPreset,
  buildBankLogoUrl,
  findBankPresetByIdOrName
} from "../data/banks"

type BrasilApiBank = {
  ispb: string
  name: string
  code: number
  fullName: string
}

const domainByKeyword: Array<{ keywords: string[]; domain: string }> = [
  { keywords: ["nubank"], domain: "nubank.com.br" },
  { keywords: ["banco do brasil", "bb "], domain: "bb.com.br" },
  { keywords: ["mercado pago"], domain: "mercadopago.com.br" },
  { keywords: ["credicard"], domain: "credicard.com.br" },
  { keywords: ["itau"], domain: "itau.com.br" },
  { keywords: ["bradesco"], domain: "bradesco.com.br" },
  { keywords: ["santander"], domain: "santander.com.br" },
  { keywords: ["caixa"], domain: "caixa.gov.br" },
  { keywords: ["inter"], domain: "inter.co" },
  { keywords: ["c6"], domain: "c6bank.com.br" },
  { keywords: ["picpay"], domain: "picpay.com" }
]

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function toId(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function matchPreset(bank: BrasilApiBank) {
  const bankName = normalizeText(`${bank.name} ${bank.fullName}`)
  return bankPresets.find((preset) => {
    const presetName = normalizeText(preset.name)
    return bankName.includes(presetName) || presetName.includes(bankName)
  })
}

function findDomain(bank: BrasilApiBank, preset?: BankPreset) {
  if (preset?.domain) {
    return preset.domain
  }

  const bankName = normalizeText(`${bank.name} ${bank.fullName}`)
  const match = domainByKeyword.find((item) =>
    item.keywords.some((keyword) => bankName.includes(normalizeText(keyword)))
  )
  return match?.domain
}

export async function fetchBankInstitutions(): Promise<BankPreset[]> {
  try {
    const response = await fetch("https://brasilapi.com.br/api/banks/v1")
    if (!response.ok) {
      throw new Error("Falha ao carregar bancos")
    }

    const payload = (await response.json()) as BrasilApiBank[]
    if (!Array.isArray(payload) || payload.length === 0) {
      return bankPresets
    }

    const merged = payload.map((bank) => {
      const preset = matchPreset(bank)
      const domain = findDomain(bank, preset)
      const knownPreset =
        preset || findBankPresetByIdOrName(undefined, bank.fullName || bank.name)
      const bankName = bank.fullName || bank.name
      return {
        id: knownPreset?.id || `bank-${toId(bankName || bank.ispb)}`,
        name: bankName,
        brandColor: knownPreset?.brandColor || "#10B981",
        domain,
        logoUrl: knownPreset?.logoUrl || buildBankLogoUrl(domain, bankName),
        ispb: bank.ispb
      }
    })

    const seen = new Set<string>()
    const unique = merged.filter((item) => {
      const key = normalizeText(item.name)
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })

    const presetIds = new Set(bankPresets.map((preset) => preset.id))
    const apiOnly = unique.filter((item) => !presetIds.has(item.id))

    return [...bankPresets, ...apiOnly]
  } catch {
    return bankPresets
  }
}
