import { Transaction } from "../types/transaction"
import { ContractConfig, FixedCost, InstallmentPlan } from "../types/planning"
import { CreditCard } from "../types/card"
import { Holiday } from "../services/calendar"
import { getWorkingMonthMetrics } from "./business-days"

export function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function getTodayDayOfMonth() {
  return new Date().getDate()
}

export function monthKeyToIndex(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  return year * 12 + (month - 1)
}

export function isMonthKeyOnOrBefore(monthKey: string, referenceMonthKey: string) {
  return monthKeyToIndex(monthKey) <= monthKeyToIndex(referenceMonthKey)
}

export function isMonthKeyAfter(monthKey: string, referenceMonthKey: string) {
  return monthKeyToIndex(monthKey) > monthKeyToIndex(referenceMonthKey)
}

export function getCardManualInvoiceAmount(card: CreditCard, monthKey: string) {
  const valueFromMap = card.manualInvoiceByMonth?.[monthKey]
  if (Number.isFinite(valueFromMap)) {
    return valueFromMap || 0
  }

  return 0
}

export function isCardInvoicePaidForMonth(card: CreditCard, monthKey: string) {
  if (!card.paidThroughMonth) {
    return false
  }

  return isMonthKeyOnOrBefore(monthKey, card.paidThroughMonth)
}

export function dateToMonthKey(dateString: string) {
  if (!dateString) {
    return getCurrentMonthKey()
  }

  const [year, month] = dateString.split("-")
  return `${year}-${month}`
}

function getDaysInMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  return new Date(year, month, 0).getDate()
}

function buildMonthDate(monthKey: string, day: number) {
  const safeDay = Math.min(Math.max(day, 1), getDaysInMonth(monthKey))
  return `${monthKey}-${String(safeDay).padStart(2, "0")}`
}

function getDayFromDate(dateString?: string) {
  if (!dateString) {
    return undefined
  }

  const [, , dayPart] = dateString.split("-")
  const day = Number(dayPart)
  if (!Number.isFinite(day) || day < 1 || day > 31) {
    return undefined
  }

  return Math.round(day)
}

function sanitizeCompetenceOffsetMonths(value?: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(Math.max(Math.round(value || 0), 0), 12)
}

function sanitizeStartMonth(value?: string) {
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
    return value
  }

  return undefined
}

export function sanitizeChargeDay(value?: number) {
  if (!Number.isFinite(value)) {
    return undefined
  }

  return Math.min(Math.max(Math.round(value || 0), 1), 31)
}

export function sanitizeDueOffsetMonths(value?: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(Math.max(Math.round(value || 0), 0), 1)
}

export function getMonthDateFromDay(monthKey: string, day?: number) {
  return buildMonthDate(monthKey, sanitizeChargeDay(day) || 1)
}

export function isFixedCostActiveForMonth(cost: FixedCost, monthKey: string) {
  return !cost.startMonth || !isMonthKeyAfter(cost.startMonth, monthKey)
}

export function getFixedCostOccurrenceMonthForDueMonth(
  cost: FixedCost,
  dueMonth: string
) {
  return addMonths(dueMonth, -sanitizeDueOffsetMonths(cost.dueOffsetMonths))
}

export function getFixedCostDueMonth(cost: FixedCost, occurrenceMonth: string) {
  return addMonths(occurrenceMonth, sanitizeDueOffsetMonths(cost.dueOffsetMonths))
}

export function getInstallmentOccurrenceMonthForDueMonth(
  plan: InstallmentPlan,
  dueMonth: string
) {
  return addMonths(dueMonth, -sanitizeDueOffsetMonths(plan.dueOffsetMonths))
}

export function getInstallmentDueMonth(
  plan: InstallmentPlan,
  occurrenceMonth: string
) {
  return addMonths(occurrenceMonth, sanitizeDueOffsetMonths(plan.dueOffsetMonths))
}

export function getOperationalDateForMonth(monthKey: string) {
  return buildMonthDate(monthKey, getTodayDayOfMonth())
}

export function isCreditChargeAlreadyPosted(input: {
  monthKey: string
  chargeDay?: number
  referenceMonthKey?: string
  referenceDay?: number
}) {
  const referenceMonthKey = input.referenceMonthKey || getCurrentMonthKey()
  const referenceDay = input.referenceDay || getTodayDayOfMonth()

  if (isMonthKeyAfter(input.monthKey, referenceMonthKey)) {
    return false
  }

  if (isMonthKeyAfter(referenceMonthKey, input.monthKey)) {
    return true
  }

  const chargeDay = sanitizeChargeDay(input.chargeDay)
  if (!chargeDay) {
    return true
  }

  return chargeDay <= referenceDay
}

export function getCltIncomeDateForMonth(contractConfig: ContractConfig, monthKey: string) {
  const competenceOffsetMonths = sanitizeCompetenceOffsetMonths(
    contractConfig.cltCompetenceOffsetMonths
  )
  const receiptMonth = addMonths(monthKey, competenceOffsetMonths)
  const payday = getDayFromDate(contractConfig.cltPaydayDate) || 5
  return buildMonthDate(receiptMonth, payday)
}

export function getCltProjectedRevenueForMonth(contractConfig: ContractConfig, monthKey: string) {
  const salary = Math.max(contractConfig.cltNetSalary, 0)
  if (salary <= 0) {
    return 0
  }

  const competenceOffsetMonths = sanitizeCompetenceOffsetMonths(
    contractConfig.cltCompetenceOffsetMonths
  )
  const startMonth =
    sanitizeStartMonth(contractConfig.incomeStartMonth) ||
    addMonths(dateToMonthKey(contractConfig.cltPaydayDate), -competenceOffsetMonths)
  if (isMonthKeyAfter(startMonth, monthKey)) {
    return 0
  }

  return salary
}

export function getPjIncomeDateForMonth(contractConfig: ContractConfig, monthKey: string) {
  const competenceOffsetMonths = sanitizeCompetenceOffsetMonths(
    contractConfig.pjCompetenceOffsetMonths
  )
  const receiptMonth = addMonths(monthKey, competenceOffsetMonths)
  const payday = getDayFromDate(contractConfig.pjPaydayDate) || 5
  return buildMonthDate(receiptMonth, payday)
}

export function getPjProjectedRevenueForMonth(input: {
  contractConfig: ContractConfig
  monthKey: string
  holidays: Holiday[]
}) {
  const competenceOffsetMonths = sanitizeCompetenceOffsetMonths(
    input.contractConfig.pjCompetenceOffsetMonths
  )
  const startMonth =
    sanitizeStartMonth(input.contractConfig.incomeStartMonth) ||
    addMonths(dateToMonthKey(input.contractConfig.pjPaydayDate), -competenceOffsetMonths)
  if (isMonthKeyAfter(startMonth, input.monthKey)) {
    return 0
  }

  return getWorkingMonthMetrics({
    monthKey: input.monthKey,
    holidays: input.holidays,
    hoursPerWorkday: input.contractConfig.hoursPerWorkday,
    hourlyRate: input.contractConfig.hourlyRate
  }).projectedRevenue
}

export function getCreditTransactionDueMonth(transactionDate: string, card: CreditCard) {
  const closingMonth = getCreditTransactionClosingMonth(transactionDate, card)
  if (!closingMonth) {
    return dateToMonthKey(transactionDate)
  }

  return card.dueDay > card.closeDay ? closingMonth : addMonths(closingMonth, 1)
}

// Mes de fechamento fisico do ciclo. Ex.: Mercado Pago fecha em 09/06 para
// compras feitas depois de 09/05, mas essa ainda e a fatura operacional de maio.
function getCreditTransactionClosingMonth(transactionDate: string, card: CreditCard) {
  const [year, month, day] = transactionDate.split("-").map(Number)
  if (!year || !month || !day) {
    return dateToMonthKey(transactionDate)
  }

  const purchaseMonth = `${year}-${String(month).padStart(2, "0")}`
  return day <= card.closeDay ? purchaseMonth : addMonths(purchaseMonth, 1)
}

// Mes operacional da fatura mostrado no dashboard. A fatura e nomeada pelo mes
// anterior ao vencimento: compra 15/05 no ciclo que vence em 06 => fatura 05.
export function getCreditTransactionStatementMonth(transactionDate: string, card: CreditCard) {
  return addMonths(getCreditTransactionDueMonth(transactionDate, card), -1)
}

export function getCreditFixedCostStatementMonth(
  cost: FixedCost,
  occurrenceMonth: string,
  card: CreditCard
) {
  return getCreditTransactionStatementMonth(
    getMonthDateFromDay(occurrenceMonth, getCreditFixedCostChargeDay(cost, card)),
    card
  )
}

export function getCreditFixedCostDueMonth(
  cost: FixedCost,
  occurrenceMonth: string,
  card: CreditCard
) {
  return getCreditTransactionDueMonth(
    getMonthDateFromDay(occurrenceMonth, getCreditFixedCostChargeDay(cost, card)),
    card
  )
}

function getCreditFixedCostChargeDay(cost: FixedCost, card: CreditCard) {
  const chargeDay = sanitizeChargeDay(cost.chargeDay)
  if (chargeDay) {
    return chargeDay
  }

  // Compatibilidade com dados antigos: fixos de credito criados antes do campo
  // chargeDay nao podem cair no dia 01, pois isso desloca a fatura para o mes anterior.
  return getLegacyCreditCycleChargeDay(card)
}

export function getCreditFixedCostTotalForMonth(input: {
  fixedCosts: FixedCost[]
  monthKey: string
  card: CreditCard
  mode?: "statement" | "due"
}) {
  const mode = input.mode || "due"
  const occurrenceMonths = [
    addMonths(input.monthKey, -2),
    addMonths(input.monthKey, -1),
    input.monthKey
  ]

  return occurrenceMonths.reduce((sum, occurrenceMonth) => {
    const totalForOccurrence = input.fixedCosts
      .filter(
        (cost) =>
          cost.paymentMethod === "credit" &&
          cost.cardId === input.card.id &&
          isFixedCostActiveForMonth(cost, occurrenceMonth)
      )
      .filter((cost) => {
        const invoiceMonth =
          mode === "statement"
            ? getCreditFixedCostStatementMonth(cost, occurrenceMonth, input.card)
            : getCreditFixedCostDueMonth(cost, occurrenceMonth, input.card)

        return invoiceMonth === input.monthKey
      })
      .reduce((total, cost) => total + cost.amount, 0)

    return sum + totalForOccurrence
  }, 0)
}

export function getCreditInstallmentStatementMonth(
  plan: InstallmentPlan,
  occurrenceMonth: string,
  card: CreditCard
) {
  return getCreditTransactionStatementMonth(
    getMonthDateFromDay(occurrenceMonth, getCreditInstallmentChargeDay(plan, card)),
    card
  )
}

export function getCreditInstallmentDueMonth(
  plan: InstallmentPlan,
  occurrenceMonth: string,
  card: CreditCard
) {
  return getCreditTransactionDueMonth(
    getMonthDateFromDay(occurrenceMonth, getCreditInstallmentChargeDay(plan, card)),
    card
  )
}

function getCreditInstallmentChargeDay(plan: InstallmentPlan, card: CreditCard) {
  const chargeDay = sanitizeChargeDay(plan.chargeDay)
  if (chargeDay) {
    return chargeDay
  }

  // Compatibilidade com parcelamentos antigos sem dia de cobranca. Mantem a
  // parcela no proprio mes operacional em vez de assumir dia 01.
  return getLegacyCreditCycleChargeDay(card)
}

function getLegacyCreditCycleChargeDay(card: CreditCard) {
  return card.dueDay > card.closeDay ? card.closeDay + 1 : card.closeDay
}

export function getCreditInstallmentTotalForMonth(input: {
  installmentPlans: InstallmentPlan[]
  monthKey: string
  card: CreditCard
  mode?: "statement" | "due"
}) {
  const mode = input.mode || "due"
  const occurrenceMonths = [
    addMonths(input.monthKey, -2),
    addMonths(input.monthKey, -1),
    input.monthKey
  ]

  return occurrenceMonths.reduce((sum, occurrenceMonth) => {
    const totalForOccurrence = input.installmentPlans
      .filter((plan) => plan.paymentMethod === "credit" && plan.cardId === input.card.id)
      .filter((plan) => getInstallmentProgress(plan, occurrenceMonth).isActive)
      .filter((plan) => {
        const invoiceMonth =
          mode === "statement"
            ? getCreditInstallmentStatementMonth(plan, occurrenceMonth, input.card)
            : getCreditInstallmentDueMonth(plan, occurrenceMonth, input.card)

        return invoiceMonth === input.monthKey
      })
      .reduce((total, plan) => total + plan.installmentValue, 0)

    return sum + totalForOccurrence
  }, 0)
}

export function getFixedCostsTotal(fixedCosts: FixedCost[]) {
  return fixedCosts.reduce((total, cost) => total + cost.amount, 0)
}

export function getNonCreditFixedCostTotalForDueMonth(
  fixedCosts: FixedCost[],
  targetMonth: string
) {
  const occurrenceMonths = [addMonths(targetMonth, -1), targetMonth]

  return occurrenceMonths.reduce((sum, occurrenceMonth) => {
    const totalForOccurrence = fixedCosts
      .filter(
        (cost) =>
          cost.paymentMethod !== "credit" &&
          isFixedCostActiveForMonth(cost, occurrenceMonth) &&
          getFixedCostDueMonth(cost, occurrenceMonth) === targetMonth
      )
      .reduce((total, cost) => total + cost.amount, 0)

    return sum + totalForOccurrence
  }, 0)
}

export function getNonCreditFixedCostTotalForOccurrenceMonth(
  fixedCosts: FixedCost[],
  targetMonth: string
) {
  return fixedCosts
    .filter(
      (cost) =>
        cost.paymentMethod !== "credit" && isFixedCostActiveForMonth(cost, targetMonth)
    )
    .reduce((total, cost) => total + cost.amount, 0)
}

export function getInstallmentPaidCount(installmentPlan: InstallmentPlan) {
  const paidInstallments = Number.isFinite(installmentPlan.paidInstallments)
    ? Math.floor(installmentPlan.paidInstallments)
    : 0

  return Math.min(Math.max(paidInstallments, 0), installmentPlan.totalInstallments)
}

export function getInstallmentProgress(
  installmentPlan: InstallmentPlan,
  targetMonth: string
) {
  const start = monthKeyToIndex(installmentPlan.startMonth)
  const target = monthKeyToIndex(targetMonth)
  // A numeracao exibida e cronologica e nao deve depender de paidInstallments.
  // Pagar uma fatura libera limite, mas nao reescreve o historico da parcela.
  const currentInstallment = target - start + 1
  const isActive =
    currentInstallment >= 1 &&
    currentInstallment <= installmentPlan.totalInstallments

  return {
    isActive,
    currentInstallment: isActive ? currentInstallment : 0
  }
}

export function getInstallmentRemainingCount(
  installmentPlan: InstallmentPlan,
  targetMonth: string
) {
  const paidInstallments = getInstallmentPaidCount(installmentPlan)
  const start = monthKeyToIndex(installmentPlan.startMonth)
  const target = monthKeyToIndex(targetMonth)

  if (target < start) {
    return Math.max(installmentPlan.totalInstallments - paidInstallments, 0)
  }

  const progress = getInstallmentProgress(installmentPlan, targetMonth)
  if (!progress.isActive) {
    return 0
  }

  const scheduledRemaining = installmentPlan.totalInstallments - progress.currentInstallment + 1
  const unpaidRemaining = installmentPlan.totalInstallments - paidInstallments

  return Math.min(scheduledRemaining, unpaidRemaining)
}

export function getInstallmentRemainingTotal(
  installmentPlan: InstallmentPlan,
  targetMonth: string
) {
  return installmentPlan.installmentValue * getInstallmentRemainingCount(installmentPlan, targetMonth)
}

export function getInstallmentRemainingTotalAfterPaidThrough(
  installmentPlan: InstallmentPlan,
  targetMonth: string,
  paidThroughMonth?: string
) {
  if (!paidThroughMonth) {
    return getInstallmentRemainingTotal(installmentPlan, targetMonth)
  }

  const firstUnpaidMonth = addMonths(paidThroughMonth, 1)
  const referenceMonth = isMonthKeyAfter(firstUnpaidMonth, targetMonth)
    ? firstUnpaidMonth
    : targetMonth

  return getInstallmentRemainingTotal(installmentPlan, referenceMonth)
}

export function getInstallmentTotalForMonth(
  installmentPlans: InstallmentPlan[],
  targetMonth: string
) {
  return installmentPlans
    .filter((plan) => getInstallmentProgress(plan, targetMonth).isActive)
    .reduce((total, plan) => total + plan.installmentValue, 0)
}

export function getNonCreditInstallmentTotalForDueMonth(
  installmentPlans: InstallmentPlan[],
  targetMonth: string
) {
  const occurrenceMonths = [addMonths(targetMonth, -1), targetMonth]

  return occurrenceMonths.reduce((sum, occurrenceMonth) => {
    const totalForOccurrence = installmentPlans
      .filter((plan) => plan.paymentMethod !== "credit")
      .filter((plan) => getInstallmentProgress(plan, occurrenceMonth).isActive)
      .filter((plan) => getInstallmentDueMonth(plan, occurrenceMonth) === targetMonth)
      .reduce((total, plan) => total + plan.installmentValue, 0)

    return sum + totalForOccurrence
  }, 0)
}

export function getMonthlyLeftoverFromTransactions(
  transactions: Transaction[],
  targetMonth: string
) {
  return transactions
    .filter((transaction) => dateToMonthKey(transaction.date) === targetMonth)
    .reduce((total, transaction) => {
      if (transaction.type === 1) {
        return total + transaction.value
      }

      return total - transaction.value
    }, 0)
}

export function getIncomeTransactionsTotalForMonth(
  transactions: Transaction[],
  targetMonth: string
) {
  return transactions
    .filter(
      (transaction) =>
        transaction.type === 1 &&
        (transaction.competenceMonth
          ? transaction.competenceMonth === targetMonth
          : dateToMonthKey(transaction.date) === targetMonth)
    )
    .reduce((total, transaction) => total + transaction.value, 0)
}

export function getExpectedIncomeForMonth(input: {
  contractConfig: ContractConfig
  transactions: Transaction[]
  monthKey: string
  holidays: Holiday[]
}) {
  const projectedRecurringIncome =
    input.contractConfig.incomeMode === "clt"
      ? getCltProjectedRevenueForMonth(input.contractConfig, input.monthKey)
      : getPjProjectedRevenueForMonth({
          contractConfig: input.contractConfig,
          monthKey: input.monthKey,
          holidays: input.holidays
        })

  const manualIncomeTransactions = getIncomeTransactionsTotalForMonth(
    input.transactions,
    input.monthKey
  )

  return projectedRecurringIncome + manualIncomeTransactions
}

export function getAverageMonthlyLeftover(
  transactions: Transaction[],
  targetMonth: string,
  monthsBack = 3
) {
  const validMonths = Array.from({ length: monthsBack }).map((_, index) =>
    addMonths(targetMonth, -index)
  )

  const monthlyLeftovers = validMonths.map((monthKey) =>
    getMonthlyLeftoverFromTransactions(transactions, monthKey)
  )

  if (monthlyLeftovers.length === 0) {
    return 0
  }

  const total = monthlyLeftovers.reduce((sum, value) => sum + value, 0)
  return total / monthlyLeftovers.length
}

export function hasTransactionsInMonth(
  transactions: Transaction[],
  targetMonth: string
) {
  return transactions.some(
    (transaction) => dateToMonthKey(transaction.date) === targetMonth
  )
}

export function getCommittedCostsForMonth(input: {
  cards?: CreditCard[]
  transactions?: Transaction[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  monthKey: string
}) {
  const cards = input.cards || []
  const fixedCostsTotal =
    getNonCreditFixedCostTotalForDueMonth(input.fixedCosts, input.monthKey) +
    cards.reduce(
      (total, card) =>
        total +
        getCreditFixedCostTotalForMonth({
          fixedCosts: input.fixedCosts,
          monthKey: input.monthKey,
          card,
          mode: "due"
        }),
      0
    )
  const installmentsTotal =
    getNonCreditInstallmentTotalForDueMonth(input.installmentPlans, input.monthKey) +
    getInstallmentTotalForMonth(
      input.installmentPlans.filter((plan) => plan.paymentMethod === "credit"),
      input.monthKey
    )

  // Business rule: total outflows should include cash expenses PLUS the full credit card invoices.
  // A credit card invoice for a month is:
  // active installments + credit fixed costs + ad-hoc credit transactions + manualInvoiceAmount.
  const cashFixedCostsTotal = getNonCreditFixedCostTotalForDueMonth(
    input.fixedCosts,
    input.monthKey
  )
  const cashInstallmentsTotal = getNonCreditInstallmentTotalForDueMonth(
    input.installmentPlans,
    input.monthKey
  )
  const cashTransactionsTotal = (input.transactions || [])
    .filter(
      (transaction) =>
        transaction.type === 2 &&
        transaction.paymentMethod !== "credit" &&
        dateToMonthKey(transaction.date) === input.monthKey
    )
    .reduce((total, transaction) => total + transaction.value, 0)

  const creditInvoicesTotal = cards.reduce((sum, card) => {
    const creditFixedCostsTotal = getCreditFixedCostTotalForMonth({
      fixedCosts: input.fixedCosts,
      monthKey: input.monthKey,
      card,
      mode: "due"
    })

    const creditInstallmentsTotal = getCreditInstallmentTotalForMonth({
      installmentPlans: input.installmentPlans,
      monthKey: input.monthKey,
      card,
      mode: "due"
    })

    const creditTransactionsTotal = (input.transactions || [])
      .filter(
        (transaction) =>
          transaction.type === 2 &&
          transaction.paymentMethod === "credit" &&
          transaction.cardId === card.id &&
          getCreditTransactionDueMonth(transaction.date, card) === input.monthKey
      )
      .reduce((total, transaction) => total + transaction.value, 0)

    // Ajuste manual e salvo no mes operacional da fatura, mas impacta o
    // desembolso no mes de vencimento.
    const manualInvoiceAmount = getCardManualInvoiceAmount(card, addMonths(input.monthKey, -1))

    return (
      sum +
      creditFixedCostsTotal +
      creditInstallmentsTotal +
      creditTransactionsTotal +
      manualInvoiceAmount
    )
  }, 0)

  return {
    fixedCostsTotal,
    installmentsTotal,
    total:
      cashFixedCostsTotal +
      cashInstallmentsTotal +
      cashTransactionsTotal +
      creditInvoicesTotal
  }
}

export function getOperationalCostsForMonth(input: {
  cards?: CreditCard[]
  transactions?: Transaction[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  monthKey: string
}) {
  const cashFixedCostsTotal = getNonCreditFixedCostTotalForOccurrenceMonth(
    input.fixedCosts,
    input.monthKey
  )

  const creditFixedCostsTotal = (input.cards || []).reduce(
    (total, card) =>
      total +
      getCreditFixedCostTotalForMonth({
        fixedCosts: input.fixedCosts,
        monthKey: input.monthKey,
        card,
        mode: "statement"
      }),
    0
  )

  const cashInstallmentsTotal = getInstallmentTotalForMonth(
    input.installmentPlans.filter((plan) => plan.paymentMethod !== "credit"),
    input.monthKey
  )

  const creditInstallmentsTotal = (input.cards || []).reduce(
    (total, card) =>
      total +
      getCreditInstallmentTotalForMonth({
        installmentPlans: input.installmentPlans,
        monthKey: input.monthKey,
        card,
        mode: "statement"
      }),
    0
  )

  const cashTransactionsTotal = (input.transactions || [])
    .filter(
      (transaction) =>
        transaction.type === 2 &&
        transaction.paymentMethod !== "credit" &&
        dateToMonthKey(transaction.date) === input.monthKey
    )
    .reduce((total, transaction) => total + transaction.value, 0)

  const creditTransactionsTotal = (input.transactions || [])
    .filter((transaction) => {
      if (!(transaction.type === 2 && transaction.paymentMethod === "credit")) {
        return false
      }

      const card = (input.cards || []).find((item) => item.id === transaction.cardId)
      const transactionMonth = card
        ? getCreditTransactionStatementMonth(transaction.date, card)
        : dateToMonthKey(transaction.date)

      return transactionMonth === input.monthKey
    })
    .reduce((total, transaction) => total + transaction.value, 0)

  const manualInvoiceAmount = (input.cards || []).reduce(
    (total, card) => total + getCardManualInvoiceAmount(card, input.monthKey),
    0
  )

  return {
    fixedCostsTotal: cashFixedCostsTotal + creditFixedCostsTotal,
    installmentsTotal: cashInstallmentsTotal + creditInstallmentsTotal,
    total:
      cashFixedCostsTotal +
      creditFixedCostsTotal +
      cashInstallmentsTotal +
      creditInstallmentsTotal +
      cashTransactionsTotal +
      creditTransactionsTotal +
      manualInvoiceAmount
  }
}

export function buildProjectionTimeline(input: {
  cards: CreditCard[]
  transactions: Transaction[]
  fixedCosts: FixedCost[]
  installmentPlans: InstallmentPlan[]
  goalsMonthlyContribution?: number
  targetMonth: string
  monthsForward?: number
  projectedRevenueByMonth?: Record<string, number>
}) {
  const monthsForward = input.monthsForward ?? 12

  let cumulativeBalance = 0

  return Array.from({ length: monthsForward }).map((_, index) => {
    const monthKey = addMonths(input.targetMonth, index)
    const projectedRevenueBase = input.projectedRevenueByMonth?.[monthKey] || 0
    const manualIncomesForMonth = getIncomeTransactionsTotalForMonth(
      input.transactions,
      monthKey
    )
    const projectedRevenue = projectedRevenueBase + manualIncomesForMonth
    const goalsMonthlyContribution = Math.max(input.goalsMonthlyContribution || 0, 0)
    const operational = getOperationalCostsForMonth({
      cards: input.cards,
      transactions: input.transactions,
      fixedCosts: input.fixedCosts,
      installmentPlans: input.installmentPlans,
      monthKey
    })

    // Projected leftover should reflect what will remain:
    // projected revenue minus all outflows (cash + credit invoices + goals contribution).
    const committedCosts = operational.total + goalsMonthlyContribution
    const projectedLeftover = projectedRevenue - committedCosts
    cumulativeBalance += projectedLeftover

    return {
      monthKey,
      projectedRevenue,
      projectedLeftover,
      committedCosts,
      fixedCostsTotal: operational.fixedCostsTotal,
      installmentsTotal: operational.installmentsTotal,
      goalsMonthlyContribution,
      cumulativeBalance
    }
  })
}

export function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  const date = new Date(year, month - 1, 1)

  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  })
}

export function addMonths(monthKey: string, amount: number) {
  const [year, month] = monthKey.split("-").map(Number)
  const date = new Date(year, month - 1 + amount, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}
