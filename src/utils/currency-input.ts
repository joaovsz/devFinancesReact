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
