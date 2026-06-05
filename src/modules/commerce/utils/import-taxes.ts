export type ImportRegime = "remessa_conforme" | "fora_remessa_conforme"

export type StateTaxOption = {
  label: string
  rate: number
}

export const STATE_TAX_OPTIONS: StateTaxOption[] = [
  { label: "SP, PR, DF, RO — 17%", rate: 0.17 },
  { label: "MG, MT, GO, BA, AM — 18%", rate: 0.18 },
  { label: "RJ (com FCP) — 20%", rate: 0.20 },
  { label: "SC, AC, AP, MA, PI, RR, SE, TO — 12%", rate: 0.12 },
  { label: "CE — 15%", rate: 0.15 },
  { label: "ES, PB — 17,5%", rate: 0.175 }
]

export type ImportTaxInput = {
  /**
   * Valor unitário do produto em USD (antes de multiplicar pela quantidade).
   * O cálculo usa productValueUsd + shippingUsd + insuranceUsd como valor aduaneiro.
   */
  productValueUsd: number
  internationalShippingUsd: number
  insuranceUsd: number
  dollarRate: number
  icmsRate: number
  regime: ImportRegime
  quantity: number
}

export type TaxBreakdownItem = {
  label: string
  value: number
  rateLabel: string
}

export type ImportTaxResult = {
  customsValueUsd: number
  customsValueBrl: number
  federalImportTaxBrl: number
  icmsBrl: number
  totalTaxBrl: number
  totalImportCostBrl: number
  unitImportCostBrl: number
  breakdown: TaxBreakdownItem[]
}

/**
 * Calcula os impostos de importação segundo as regras do Programa Remessa Conforme
 * (Receita Federal BR, 2024) e importações fora do programa.
 *
 * Fontes: Medida Provisória + Portaria MF + regras vigentes conforme documento
 * "Regras Taxas Importação Atualizado.md"
 */
export function calculateImportTaxes(input: ImportTaxInput): ImportTaxResult {
  const { productValueUsd, internationalShippingUsd, insuranceUsd, dollarRate, icmsRate, regime, quantity } = input

  // 1. Valor aduaneiro em USD (produto × qtde + frete + seguro)
  const customsValueUsd = productValueUsd * quantity + internationalShippingUsd + insuranceUsd

  // 2. Valor aduaneiro em BRL
  const customsValueBrl = customsValueUsd * dollarRate

  // 3. Imposto de Importação federal
  let federalImportTaxBrl = 0

  if (regime === "remessa_conforme") {
    if (customsValueUsd <= 50) {
      // Até US$ 50 no PRC: II = 0%
      federalImportTaxBrl = 0
    } else {
      // De US$ 50,01 a US$ 3.000 no PRC: II = (customsValueUsd × 60% − US$30) × cotação
      federalImportTaxBrl = Math.max(0, (customsValueUsd * 0.6 - 30) * dollarRate)
    }
  } else {
    // Fora do Remessa Conforme: II = customsValueBrl × 60%
    federalImportTaxBrl = customsValueBrl * 0.6
  }

  // 4. ICMS "por dentro"
  // Formula: ((customsValueBrl + II) / (1 - icmsRate)) × icmsRate
  const icmsBrl =
    icmsRate < 1
      ? ((customsValueBrl + federalImportTaxBrl) / (1 - icmsRate)) * icmsRate
      : 0

  const totalTaxBrl = federalImportTaxBrl + icmsBrl

  // 5. Custo total de importação e custo unitário
  const totalImportCostBrl = customsValueBrl + totalTaxBrl
  const unitImportCostBrl = quantity > 0 ? totalImportCostBrl / quantity : 0

  // 6. Breakdown para exibição
  const breakdown: TaxBreakdownItem[] = [
    {
      label: "Valor aduaneiro (base de cálculo)",
      value: customsValueBrl,
      rateLabel: `U$ ${customsValueUsd.toFixed(2)}`
    }
  ]

  if (regime === "remessa_conforme" && customsValueUsd <= 50) {
    breakdown.push({ label: "II — Imposto de Importação", value: 0, rateLabel: "0% (até U$ 50)" })
  } else if (regime === "remessa_conforme") {
    breakdown.push({
      label: "II — Imposto de Importação",
      value: federalImportTaxBrl,
      rateLabel: "60% − U$ 30 (PRC)"
    })
  } else {
    breakdown.push({
      label: "II — Imposto de Importação",
      value: federalImportTaxBrl,
      rateLabel: "60% (fora do PRC)"
    })
  }

  breakdown.push({
    label: `ICMS (${(icmsRate * 100).toFixed(1)}%, por dentro)`,
    value: icmsBrl,
    rateLabel: `${(icmsRate * 100).toFixed(1)}%`
  })

  return {
    customsValueUsd,
    customsValueBrl,
    federalImportTaxBrl,
    icmsBrl,
    totalTaxBrl,
    totalImportCostBrl,
    unitImportCostBrl,
    breakdown
  }
}
