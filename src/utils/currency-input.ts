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
