export function formatCurrencyFromNumber(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

export function formatCurrencyInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "")
  if (!digitsOnly) {
    return ""
  }

  const numericValue = Number(digitsOnly) / 100
  return formatCurrencyFromNumber(numericValue)
}

export function parseCurrencyInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "")
  if (!digitsOnly) {
    return 0
  }

  return Number(digitsOnly) / 100
}

export function formatSignedCurrencyInput(value: string) {
  const isNegative = value.trim().startsWith("-")
  const formatted = formatCurrencyInput(value)
  if (!formatted) {
    return isNegative ? "-" : ""
  }

  return isNegative ? `-${formatted}` : formatted
}

export function parseSignedCurrencyInput(value: string) {
  const parsed = parseCurrencyInput(value)
  return value.trim().startsWith("-") ? -parsed : parsed
}

/**
 * Formata um input de valor em dólar americano com prefixo "U$ ".
 * Usa a mesma lógica de centavos que o BRL (digitar "2550" = U$ 25,50).
 */
export function formatUsdInput(value: string): string {
  const digitsOnly = value.replace(/\D/g, "")
  if (!digitsOnly) return ""
  const numericValue = Number(digitsOnly) / 100
  return "U$ " + numericValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parseUsdInput(value: string): number {
  const digitsOnly = value.replace(/\D/g, "")
  if (!digitsOnly) return 0
  return Number(digitsOnly) / 100
}

/**
 * Formata um input de taxa decimal (ex: cotação do dólar, percentual).
 * Aceita dígitos + vírgula como separador decimal, até 4 casas.
 * Exemplos: "5" -> "5", "5," -> "5,", "5,75" -> "5,75", "5,75001" -> "5,7500"
 */
export function formatRateInput(value: string): string {
  // Permite apenas dígitos e um separador decimal (vírgula ou ponto → vira vírgula)
  const normalized = value.replace(/\./g, ",").replace(/[^\d,]/g, "")
  const firstComma = normalized.indexOf(",")
  if (firstComma === -1) return normalized
  const integer = normalized.slice(0, firstComma)
  const decimals = normalized.slice(firstComma + 1).replace(/,/g, "").slice(0, 4)
  return integer + "," + decimals
}

export function parseRateInput(value: string): number {
  return Number(value.replace(",", ".")) || 0
}
