function sanitizeMoneyValue(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(value, 0)
}

export function calculateMonthsToGoal(
  targetAmount: number,
  currentSaved: number,
  monthlyContribution: number
) {
  const safeTarget = sanitizeMoneyValue(targetAmount)
  const safeCurrentSaved = sanitizeMoneyValue(currentSaved)
  const safeContribution = sanitizeMoneyValue(monthlyContribution)
  const remainingAmount = Math.max(safeTarget - safeCurrentSaved, 0)

  if (remainingAmount <= 0) {
    return 0
  }

  if (safeContribution <= 0) {
    return Number.POSITIVE_INFINITY
  }

  return Math.ceil(remainingAmount / safeContribution)
}

export function addMonths(baseDate: Date, months: number) {
  const date = new Date(baseDate)
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  return date
}

function capitalize(text: string) {
  if (!text) {
    return text
  }

  return text[0].toUpperCase() + text.slice(1)
}

export function formatGoalCompletionDate(monthsToGoal: number, referenceDate = new Date()) {
  if (!Number.isFinite(monthsToGoal)) {
    return "Sem previsão com o aporte atual."
  }

  if (monthsToGoal <= 0) {
    return "Meta já atingida."
  }

  const completionDate = addMonths(referenceDate, monthsToGoal)
  const monthLabel = completionDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  })

  return `Meta atingida em ${capitalize(monthLabel)}`
}

export function calculateGoalProgress(targetAmount: number, currentSaved: number) {
  const safeTarget = sanitizeMoneyValue(targetAmount)
  if (safeTarget <= 0) {
    return 0
  }

  const safeCurrentSaved = sanitizeMoneyValue(currentSaved)
  return Math.min((safeCurrentSaved / safeTarget) * 100, 100)
}

export function calculateRemainingAmount(targetAmount: number, currentSaved: number) {
  return Math.max(sanitizeMoneyValue(targetAmount) - sanitizeMoneyValue(currentSaved), 0)
}
