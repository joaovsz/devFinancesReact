import { MouseEvent, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Activity,
  Beef,
  BriefcaseBusiness,
  ChartLine,
  Check,
  ChevronDown,
  CreditCard,
  Gamepad2,
  GraduationCap,
  HandCoins,
  House,
  Landmark,
  PiggyBank,
  Plus,
  Target,
  Wifi,
  Wallet
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import ReactEChartsCore from "echarts-for-react/lib/core"
import type { EChartsOption } from "echarts"
import { fetchBrazilHolidaysByYear, Holiday } from "../services/calendar"
import {
  addMonths,
  dateToMonthKey,
  getCreditTransactionDueMonth,
  getCreditTransactionStatementMonth,
  getCurrentMonthKey,
  getInstallmentRemainingTotal,
  getInstallmentTotalForMonth,
  getMonthLabel,
  isCardInvoicePaidForMonth,
  isMonthKeyAfter
} from "../utils/projections"
import { buildPlannedEntriesForMonth } from "../utils/planningEntries"
import { useTransactionStore } from "../store/useTransactionStore"
import { NumberTicker } from "./magic/NumberTicker"
import { formatCurrency } from "./Transactions"
import { bankPresets, BankPreset } from "../data/banks"
import { selectTotalMonthlyContribution, useGoalStore } from "../store/useGoalStore"
import {
  formatCurrencyFromNumber,
  formatCurrencyInput,
  parseCurrencyInput
} from "../utils/currency-input"
import { fetchBankInstitutions } from "../services/banks"
import { CreditCard as CardType } from "../types/card"
import { DismissibleInfoCard } from "./ui/DismissibleInfoCard"
import { CardInvoiceModal } from "./cards/CardInvoiceModal"
import { defaultCategories } from "../data/categories"
import { echarts } from "../utils/echarts"

type InvoicePlannedItem = {
  id: string
  label: string
  value: number
  sourceLabel: string
}

type CategoryExpenseBucket = {
  categoryId: string
  subcategoryId: string
  value: number
}

export const Cards = () => {
  const navigate = useNavigate()
  const cards = useTransactionStore((state) => state.cards)
  const transactions = useTransactionStore((state) => state.transactions)
  const fixedCosts = useTransactionStore((state) => state.fixedCosts)
  const installmentPlans = useTransactionStore((state) => state.installmentPlans)
  const contractConfig = useTransactionStore((state) => state.contractConfig)
  const totalIncomes = useTransactionStore((state) => state.totalIncomes)
  const totalExpenses = useTransactionStore((state) => state.totalExpenses)
  const goalsMonthlyContribution = useGoalStore(selectTotalMonthlyContribution)
  const addCard = useTransactionStore((state) => state.addCard)
  const updateCard = useTransactionStore((state) => state.updateCard)
  const removeCard = useTransactionStore((state) => state.removeCard)
  const markCardInvoiceAsPaid = useTransactionStore(
    (state) => state.markCardInvoiceAsPaid
  )

  const currentMonth = getCurrentMonthKey()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [showAddCardForm, setShowAddCardForm] = useState(false)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
  const [institutions, setInstitutions] = useState<BankPreset[]>(bankPresets)
  const [selectedBankId, setSelectedBankId] = useState(bankPresets[0]?.id || "other")
  const [bankSearch, setBankSearch] = useState(bankPresets[0]?.name || "")
  const [showBankOptions, setShowBankOptions] = useState(false)
  const [newCardLimit, setNewCardLimit] = useState("")
  const [newCardCloseDay, setNewCardCloseDay] = useState("")
  const [newCardDueDay, setNewCardDueDay] = useState("")
  const [invoiceCardId, setInvoiceCardId] = useState<string | null>(null)
  const [selectedCategoryDrillId, setSelectedCategoryDrillId] = useState<string | null>(null)
  const [themeVersion, setThemeVersion] = useState(0)
  const [invoiceTotalDraftByCard, setInvoiceTotalDraftByCard] = useState<
    Record<string, string>
  >({})
  const dayOptions = Array.from({ length: 31 }, (_, index) => String(index + 1))
  const cardBankOptions = useMemo(
    () => [...institutions, { id: "other", name: "Outros", brandColor: "#64748B" }],
    [institutions]
  )
  const filteredBankOptions = useMemo(
    () =>
      cardBankOptions.filter((bank) =>
        bank.name.toLowerCase().includes(bankSearch.trim().toLowerCase())
      ),
    [cardBankOptions, bankSearch]
  )

  useEffect(() => {
    let ignore = false
    const year = Number(currentMonth.split("-")[0])

    if (!(contractConfig.incomeMode === "pj" && contractConfig.useHolidayApi)) {
      setHolidays([])
      return () => {
        ignore = true
      }
    }

    fetchBrazilHolidaysByYear(year)
      .then((data) => {
        if (!ignore) {
          setHolidays(data)
        }
      })
      .catch(() => {
        if (!ignore) {
          setHolidays([])
        }
      })

    return () => {
      ignore = true
    }
  }, [currentMonth, contractConfig.incomeMode, contractConfig.useHolidayApi])

  useEffect(() => {
    let ignore = false
    fetchBankInstitutions().then((items) => {
      if (ignore || items.length === 0) {
        return
      }
      setInstitutions(items)
      if (!items.some((item) => item.id === selectedBankId)) {
        setSelectedBankId(items[0].id)
      }
    })

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    const selected = cardBankOptions.find((bank) => bank.id === selectedBankId)
    if (selected) {
      setBankSearch(selected.name)
    }
  }, [selectedBankId, cardBankOptions])

  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    const root = document.documentElement
    const observer = new MutationObserver((mutations) => {
      const themeChanged = mutations.some(
        (mutation) =>
          mutation.type === "attributes" &&
          (mutation.attributeName === "class" || mutation.attributeName === "style")
      )
      if (themeChanged) {
        setThemeVersion((current) => current + 1)
      }
    })

    observer.observe(root, { attributes: true, attributeFilter: ["class", "style"] })
    return () => observer.disconnect()
  }, [])

  const plannedEntries = useMemo(
    () =>
      buildPlannedEntriesForMonth({
        monthKey: currentMonth,
        fixedCosts,
        installmentPlans,
        contractConfig,
        holidays
      }),
    [currentMonth, fixedCosts, installmentPlans, contractConfig, holidays]
  )

  const plannedIncomes = plannedEntries
    .filter((entry) => entry.type === 1)
    .reduce((sum, entry) => sum + entry.value, 0)
  const summaryIncomes = totalIncomes + plannedIncomes
  const summaryExpenses = totalExpenses + goalsMonthlyContribution
  const summaryTotal = summaryIncomes - summaryExpenses

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [transactions]
  )

  const cardUsage = useMemo(
    () => {
      const monthKey = getCurrentMonthKey()

      return cards.map((card) => {
        const isPaidForCurrentMonth = isCardInvoicePaidForMonth(card, monthKey)
        const transactionUsage = transactions
          .filter(
            (transaction) =>
              transaction.type === 2 &&
              transaction.paymentMethod === "credit" &&
              transaction.cardId === card.id &&
              (!card.paidThroughMonth ||
                isMonthKeyAfter(
                  getCreditTransactionDueMonth(transaction.date, card),
                  card.paidThroughMonth
                ))
          )
          .reduce((sum, transaction) => sum + transaction.value, 0)

        const currentMonthInvoiceTransactions = transactions
          .filter(
            (transaction) =>
              transaction.type === 2 &&
              transaction.paymentMethod === "credit" &&
              transaction.cardId === card.id &&
              getCreditTransactionStatementMonth(transaction.date, card) === monthKey &&
              (!card.paidThroughMonth ||
                isMonthKeyAfter(
                  getCreditTransactionDueMonth(transaction.date, card),
                  card.paidThroughMonth
                ))
          )
          .reduce((sum, transaction) => sum + transaction.value, 0)

        const plannedFixedUsage = fixedCosts
          .filter((cost) => cost.paymentMethod === "credit" && cost.cardId === card.id)
          .reduce((sum, cost) => sum + cost.amount, 0)

        const plannedInstallmentsCurrentMonth = installmentPlans
          .filter((plan) => plan.paymentMethod === "credit" && plan.cardId === card.id)
          .reduce(
            (sum, plan) =>
              sum + getInstallmentTotalForMonth([plan], monthKey),
            0
          )

        const plannedInstallmentsLimitUsage = installmentPlans
          .filter((plan) => plan.paymentMethod === "credit" && plan.cardId === card.id)
          .reduce(
            (sum, plan) => sum + getInstallmentRemainingTotal(plan, monthKey),
            0
          )

        const currentInvoice = isPaidForCurrentMonth
          ? 0
          : currentMonthInvoiceTransactions +
            plannedFixedUsage +
            plannedInstallmentsCurrentMonth +
            (card.manualInvoiceAmount || 0)
        const used =
          transactionUsage +
          plannedFixedUsage +
          plannedInstallmentsLimitUsage +
          (card.manualInvoiceAmount || 0)
        const available = Math.max(card.limitTotal - used, 0)
        const usagePercentage = Math.min((used / Math.max(card.limitTotal, 1)) * 100, 100)

        return {
          ...card,
          currentInvoice,
          used,
          available,
          usagePercentage
        }
      })
    },
    [cards, transactions, fixedCosts, installmentPlans]
  )
  const selectedInvoiceCard = useMemo(
    () => cardUsage.find((card) => card.id === invoiceCardId) || null,
    [cardUsage, invoiceCardId]
  )
  const selectedInvoiceTransactions = useMemo(
    () => {
      if (!invoiceCardId) {
        return []
      }

      const selectedCard = cards.find((card) => card.id === invoiceCardId)
      if (!selectedCard) {
        return []
      }

      return transactions
        .filter(
          (transaction) =>
            transaction.type === 2 &&
            transaction.paymentMethod === "credit" &&
            transaction.cardId === invoiceCardId &&
            getCreditTransactionStatementMonth(transaction.date, selectedCard) === currentMonth
        )
        .sort((left, right) => right.date.localeCompare(left.date))
    },
    [transactions, invoiceCardId, currentMonth, cards]
  )
  const selectedInvoicePlannedItems = useMemo<InvoicePlannedItem[]>(
    () => {
      if (!invoiceCardId) {
        return []
      }

      const items = plannedEntries
        .filter(
          (entry) =>
            entry.type === 2 &&
            entry.paymentMethod === "credit" &&
            entry.cardId === invoiceCardId
        )
        .map((entry) => ({
          id: entry.id,
          label: entry.label,
          value: entry.value,
          sourceLabel:
            entry.plannedSourceType === "fixed"
              ? "Gasto fixo planejado"
              : "Parcelamento planejado"
        }))

      if ((selectedInvoiceCard?.manualInvoiceAmount || 0) > 0) {
        items.push({
          id: `planned-manual-invoice-${selectedInvoiceCard?.id}-${currentMonth}`,
          label: "Ajuste manual de fatura",
          value: selectedInvoiceCard?.manualInvoiceAmount || 0,
          sourceLabel: "Ajuste manual"
        })
      }

      return items
    },
    [plannedEntries, invoiceCardId, selectedInvoiceCard, currentMonth]
  )

  const categoryExpenseBuckets = useMemo<CategoryExpenseBucket[]>(() => {
    const byCategoryAndSubcategory = new Map<string, CategoryExpenseBucket>()

    const addExpense = (categoryId: string, subcategoryId: string, value: number) => {
      if (!(Number.isFinite(value) && value > 0)) {
        return
      }

      const key = `${categoryId}::${subcategoryId}`
      const current = byCategoryAndSubcategory.get(key)
      if (current) {
        current.value += value
        return
      }

      byCategoryAndSubcategory.set(key, { categoryId, subcategoryId, value })
    }

    transactions
      .filter(
        (transaction) =>
          transaction.type === 2 && dateToMonthKey(transaction.date) === currentMonth
      )
      .forEach((transaction) => {
        addExpense(transaction.categoryId, transaction.subcategoryId, transaction.value)
      })

    fixedCosts.forEach((cost) => {
      addExpense(cost.categoryId, cost.subcategoryId, cost.amount)
    })

    const activeInstallmentsTotal = getInstallmentTotalForMonth(installmentPlans, currentMonth)
    if (activeInstallmentsTotal > 0) {
      addExpense("__installments", "__installments", activeInstallmentsTotal)
    }

    return Array.from(byCategoryAndSubcategory.values())
  }, [transactions, fixedCosts, installmentPlans, currentMonth])

  const getCategoryName = (categoryId: string) => {
    if (categoryId === "__installments") {
      return "Parcelamentos"
    }

    return (
      defaultCategories.find((category) => category.id === categoryId)?.name ||
      "Categoria não mapeada"
    )
  }

  const getSubcategoryName = (categoryId: string, subcategoryId: string) => {
    if (categoryId === "__installments") {
      return "Parcelas ativas do mês"
    }

    const category = defaultCategories.find((item) => item.id === categoryId)
    if (!category) {
      return "Subcategoria não mapeada"
    }

    return (
      category.subcategories.find((subcategory) => subcategory.id === subcategoryId)?.name ||
      "Subcategoria não mapeada"
    )
  }

  const categorySummary = useMemo(
    () =>
      categoryExpenseBuckets.reduce<Record<string, number>>((accumulator, bucket) => {
        accumulator[bucket.categoryId] = (accumulator[bucket.categoryId] || 0) + bucket.value
        return accumulator
      }, {}),
    [categoryExpenseBuckets]
  )

  const categoryDonutData = useMemo(
    () =>
      Object.entries(categorySummary)
        .map(([categoryId, value]) => ({
          id: categoryId,
          value,
          name: getCategoryName(categoryId)
        }))
        .sort((left, right) => right.value - left.value),
    [categorySummary]
  )

  const subcategoryDonutData = useMemo(
    () =>
      categoryExpenseBuckets
        .filter((bucket) => bucket.categoryId === selectedCategoryDrillId)
        .map((bucket) => ({
          id: `${bucket.categoryId}-${bucket.subcategoryId}`,
          value: bucket.value,
          name: getSubcategoryName(bucket.categoryId, bucket.subcategoryId)
        }))
        .sort((left, right) => right.value - left.value),
    [categoryExpenseBuckets, selectedCategoryDrillId]
  )

  const totalCategoryExpenses = useMemo(
    () => categoryDonutData.reduce((sum, item) => sum + item.value, 0),
    [categoryDonutData]
  )
  const hasDrilldown = Boolean(selectedCategoryDrillId)
  const activeCategoryDonutData = hasDrilldown ? subcategoryDonutData : categoryDonutData
  const categoryChartTitle = hasDrilldown
    ? `Detalhes: ${getCategoryName(selectedCategoryDrillId || "")}`
    : "Distribuição por categoria"

  useEffect(() => {
    if (!selectedCategoryDrillId) {
      return
    }

    if (!(selectedCategoryDrillId in categorySummary)) {
      setSelectedCategoryDrillId(null)
    }
  }, [selectedCategoryDrillId, categorySummary])

  const isLightTheme =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("theme-light")
  const themeComputedStyle =
    typeof document !== "undefined"
      ? window.getComputedStyle(document.documentElement)
      : null
  const accent500 = themeComputedStyle?.getPropertyValue("--accent-500")?.trim()
  const accent400 = themeComputedStyle?.getPropertyValue("--accent-400")?.trim()
  const accent300 = themeComputedStyle?.getPropertyValue("--accent-300")?.trim()
  const chartSliceBorderColor =
    themeComputedStyle?.getPropertyValue("--chart-slice-border")?.trim() ||
    (isLightTheme ? "rgba(255, 255, 255, 1)" : "rgba(24, 24, 27, 0.9)")
  const accent500Color = accent500 ? `rgb(${accent500})` : "#6366f1"
  const accent400Color = accent400 ? `rgb(${accent400})` : "#818cf8"
  const accent300Color = accent300 ? `rgb(${accent300})` : "#a5b4fc"

  const categoryDistributionOption = useMemo<EChartsOption>(
    () => ({
      backgroundColor: "transparent",
      color: [
        accent500Color,
        accent400Color,
        accent300Color,
        "#0ea5e9",
        "#22c55e",
        "#f59e0b",
        "#f43f5e"
      ],
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const item = Array.isArray(params) ? params[0] : params
          const rawValue =
            typeof item?.value === "number"
              ? item.value
              : Number(item?.value || 0)
          const safePercent = Number.isFinite(item?.percent) ? item.percent : 0
          return `${item?.name || "Categoria"}<br/>${formatCurrency(rawValue)} (${safePercent}%)`
        }
      },
      legend: {
        show: false
      },
      series: [
        {
          name: categoryChartTitle,
          type: "pie",
          center: ["50%", "48%"],
          radius: ["48%", "72%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: chartSliceBorderColor,
            borderWidth: 2
          },
          label: {
            color: isLightTheme ? "#111827" : "#e4e4e7",
            formatter: "{d}%",
            fontWeight: 600,
            textBorderColor: chartSliceBorderColor,
            textBorderWidth: 3
          },
          data: activeCategoryDonutData
        }
      ]
    }),
    [
      activeCategoryDonutData,
      categoryChartTitle,
      isLightTheme,
      chartSliceBorderColor,
      accent500Color,
      accent400Color,
      accent300Color,
      themeVersion
    ]
  )
  const categoryDistributionEvents = useMemo(
    () => ({
      click: (params: { data?: { id?: string } }) => {
        if (hasDrilldown) {
          return
        }

        const nextCategoryId = params.data?.id
        if (!nextCategoryId) {
          return
        }

        setSelectedCategoryDrillId(nextCategoryId)
      }
    }),
    [hasDrilldown]
  )

  const totalInvoicesForMonth = useMemo(
    () => cardUsage.reduce((sum, card) => sum + card.currentInvoice, 0),
    [cardUsage]
  )
  const invoiceDistributionByCard = useMemo(
    () =>
      cardUsage
        .filter((card) => card.currentInvoice > 0)
        .sort((left, right) => right.currentInvoice - left.currentInvoice),
    [cardUsage]
  )

  const totalCreditUsed = cardUsage.reduce((sum, card) => sum + card.used, 0)
  const totalCreditLimit = cardUsage.reduce((sum, card) => sum + card.limitTotal, 0)

  function getCardBrandColor(cardName: string, currentColor: string) {
    return cardName.toLowerCase().includes("ourocard") ? "#FFCD00" : currentColor
  }

  function getCategoryIcon(categoryId: string, subcategoryId?: string): LucideIcon {
    if (categoryId === "moradia" && subcategoryId) {
      if (subcategoryId === "internet") {
        return Wifi
      }
      if (subcategoryId === "aluguel") {
        return Landmark
      }
    }

    switch (categoryId) {
      case "rendas":
        return HandCoins
      case "moradia":
        return House
      case "alimentacao":
        return Beef
      case "saude-bem-estar":
        return Activity
      case "educacao-carreira":
        return GraduationCap
      case "lazer-assinaturas":
        return Gamepad2
      case "impostos-empresa":
        return Landmark
      case "bens-equipamentos":
        return CreditCard
      case "patrimonio-metas":
        return PiggyBank
      case "outros":
        return BriefcaseBusiness
      case "__installments":
        return Target
      default:
        return ChartLine
    }
  }

  function hexToRgba(hex: string, alpha: number) {
    const normalized = hex.replace("#", "")
    const bigint = parseInt(
      normalized.length === 3
        ? normalized.split("").map((char) => char + char).join("")
        : normalized,
      16
    )
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  function updateCardField(card: CardType, field: keyof CardType, value: string) {
    const numericValue = Number(value)
    if (Number.isNaN(numericValue)) {
      return
    }

    updateCard({
      ...card,
      [field]: numericValue
    })
  }

  function setInvoiceTotalDraft(cardId: string, inputValue: string) {
    setInvoiceTotalDraftByCard((current) => ({
      ...current,
      [cardId]: inputValue
    }))
  }

  function getInvoiceTotalDraft(cardId: string) {
    return invoiceTotalDraftByCard[cardId]
  }

  function clearInvoiceTotalDraft(cardId: string) {
    setInvoiceTotalDraftByCard((current) => {
      if (!(cardId in current)) {
        return current
      }

      const next = { ...current }
      delete next[cardId]
      return next
    })
  }

  function commitInvoiceTotalFromDraft(card: CardType & { currentInvoice: number }) {
    const draftValue = getInvoiceTotalDraft(card.id)
    if (draftValue === undefined) {
      return
    }

    const totalInvoice = parseCurrencyInput(draftValue)
    const accountedWithoutManual = card.currentInvoice - (card.manualInvoiceAmount || 0)
    const nextManualAdjustment = Math.max(totalInvoice - accountedWithoutManual, 0)
    updateCardField(card, "manualInvoiceAmount", String(nextManualAdjustment))
    clearInvoiceTotalDraft(card.id)
  }

  function handleAddCard() {
    if (!selectedBankId || !newCardLimit || !newCardCloseDay || !newCardDueDay) {
      return
    }

    const normalizedSearch = bankSearch.trim().toLowerCase()
    const selectedBank =
      cardBankOptions.find((bank) => bank.id === selectedBankId) ||
      cardBankOptions.find((bank) => bank.name.toLowerCase() === normalizedSearch) ||
      filteredBankOptions[0]
    addCard({
      id: crypto.randomUUID(),
      bankId: selectedBank?.id || "other",
      name: selectedBank?.name || "Outros",
      brandColor: selectedBank?.brandColor || "#64748B",
      logoUrl: selectedBank?.logoUrl,
      limitTotal: parseCurrencyInput(newCardLimit),
      closeDay: Number(newCardCloseDay),
      dueDay: Number(newCardDueDay),
      manualInvoiceAmount: 0
    })

    setNewCardLimit("")
    setNewCardCloseDay("")
    setNewCardDueDay("")
    setShowAddCardForm(false)
  }

  function handleRemoveCard(cardId: string) {
    removeCard(cardId)
    setExpandedCardId((current) => (current === cardId ? null : current))
    setInvoiceCardId((current) => (current === cardId ? null : current))
  }

  function openCardInvoice(cardId: string) {
    setInvoiceCardId(cardId)
  }

  function closeCardInvoice() {
    setInvoiceCardId(null)
  }

  function openTransactionsForInvoice(cardId: string) {
    closeCardInvoice()
    navigate(`/transacoes?cardId=${cardId}`)
  }

  function openAddExpenseForInvoice(cardId: string) {
    closeCardInvoice()
    navigate(`/transacoes?cardId=${cardId}&action=add-expense`)
  }

  function saveManualInvoiceAdjustment(cardId: string, value: number) {
    const card = cards.find((currentCard) => currentCard.id === cardId)
    if (!card) {
      return
    }

    updateCard({
      ...card,
      manualInvoiceAmount: Math.max(value, 0)
    })
  }

  function removeManualInvoiceAdjustment(cardId: string) {
    saveManualInvoiceAdjustment(cardId, 0)
  }

  function markInvoiceAsPaid(card: CardType) {
    const confirmed = window.confirm(
      `Confirmar pagamento da fatura de ${card.name} deste mês?`
    )
    if (!confirmed) {
      return
    }

    markCardInvoiceAsPaid(card.id, currentMonth)
    closeCardInvoice()
  }

  return (
    <section className="grid gap-4 lg:grid-cols-12">
      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-6">
        <div className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Saldo total</div>
        <NumberTicker
          className={`text-4xl ${summaryTotal >= 0 ? "text-zinc-100" : "text-amber-300"}`}
          value={summaryTotal}
          format={formatCurrency}
        />
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="mb-1 text-xs text-zinc-500">Entradas</div>
            <NumberTicker className="text-lg text-emerald-400" value={summaryIncomes} format={formatCurrency} />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="mb-1 text-xs text-zinc-500">Saídas</div>
            <NumberTicker className="text-lg text-amber-400" value={summaryExpenses} format={formatCurrency} />
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-zinc-400">Crédito usado</span>
          <CreditCard size={16} className="text-zinc-500" />
        </div>
        <NumberTicker className="text-2xl text-zinc-100" value={totalCreditUsed} format={formatCurrency} />
        <div className="mt-3 h-2 w-full rounded-full bg-zinc-800">
          <div
            className="h-2 rounded-full bg-amber-400"
            style={{ width: `${Math.min((totalCreditUsed / Math.max(totalCreditLimit, 1)) * 100, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-bold text-zinc-500">
          Limite total: {formatCurrency(totalCreditLimit)}
        </p>
      </article>

      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-zinc-400">Movimentação</span>
          <Wallet size={16} className="text-zinc-500" />
        </div>
        <p className="text-sm text-zinc-300">
          {transactions.length} transações registradas.
        </p>
        <Link
          to="/transacoes"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
        >
          Abrir transações
        </Link>
      </article>

      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Gastos por categoria
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {hasDrilldown
                ? "Mostrando os detalhes da categoria selecionada."
                : "Clique em uma categoria para ver os detalhes."}
            </p>
          </div>
          {hasDrilldown && (
            <button
              type="button"
              onClick={() => setSelectedCategoryDrillId(null)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            >
              Voltar categorias
            </button>
          )}
        </div>

        {activeCategoryDonutData.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
            <ReactEChartsCore
              echarts={echarts}
              option={categoryDistributionOption}
              onEvents={categoryDistributionEvents}
              style={{ height: 340, width: "100%" }}
              notMerge
              lazyUpdate
            />
            <div className="rounded-xl border border-zinc-800 bg-zinc-950">
              {activeCategoryDonutData.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5 text-sm last:border-b-0">
                  <span className="flex min-w-0 items-center gap-2 text-zinc-300">
                    {(() => {
                      const iconCategoryId = hasDrilldown
                        ? selectedCategoryDrillId || "outros"
                        : item.id
                      const iconSubcategoryId =
                        hasDrilldown && selectedCategoryDrillId
                          ? item.id.replace(`${selectedCategoryDrillId}-`, "")
                          : undefined
                      const Icon = getCategoryIcon(iconCategoryId, iconSubcategoryId)
                      return <Icon size={14} className="shrink-0 text-zinc-500" />
                    })()}
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="ml-3 font-semibold text-zinc-100">{formatCurrency(item.value)}</span>
                </div>
              ))}
              <div className="border-t border-zinc-800 px-3 py-2.5 text-sm text-zinc-400">
                Total do mês {getMonthLabel(currentMonth)}:{" "}
                <span className="font-semibold text-zinc-100">{formatCurrency(totalCategoryExpenses)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-10 text-center text-sm text-zinc-500">
            Sem despesas categorizadas no mês atual.
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-4">
        <div className="mb-2 text-xs uppercase tracking-wide text-zinc-400">
          Total de faturas (mês)
        </div>
        <NumberTicker
          className="text-3xl text-zinc-100"
          value={totalInvoicesForMonth}
          format={formatCurrency}
        />
        <p className="mt-1 text-xs text-zinc-500">{getMonthLabel(currentMonth)}</p>
        <div className="mt-4 space-y-0">
          {invoiceDistributionByCard.length === 0 && (
            <div className="rounded-lg border border-zinc-800 px-3 py-3 text-xs text-zinc-500">
              Nenhuma fatura ativa neste mês.
            </div>
          )}
          {invoiceDistributionByCard.map((card) => (
            <div
              key={`invoice-summary-${card.id}`}
              className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 text-xs last:border-b-0"
            >
              <span className="truncate text-zinc-300">{card.name}</span>
              <span className="ml-3 font-semibold text-zinc-100">
                {formatCurrency(card.currentInvoice)}
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Últimas transações</h2>
          <Link to="/transacoes" className="text-xs text-zinc-500 hover:text-zinc-300">Ver todas</Link>
        </div>
        <div className="space-y-0">
          {recentTransactions.length === 0 && (
            <div className="rounded-xl border border-zinc-800 px-3 py-6 text-center text-xs text-zinc-500">
              Sem lançamentos recentes.
            </div>
          )}
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <div className="truncate text-sm text-zinc-200">{transaction.label}</div>
                <div className="text-[11px] text-zinc-500">{transaction.date.split("-").reverse().join("/")}</div>
              </div>
              <span className={`text-sm font-black ${transaction.type === 1 ? "text-emerald-400" : "text-amber-400"}`}>
                {transaction.type === 1 ? "+" : "-"}{formatCurrency(transaction.value)}
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-8">
        <DismissibleInfoCard
          storageKey="info-card-credit-cards"
          title="Como usar Meus Cartões"
          description="Aqui você acompanha limite usado/disponível e gerencia cada cartão."
          items={[
            "Dê duplo clique no cartão para abrir edição.",
            "No modo edição você pode alterar limite, fechamento e vencimento.",
            "Também é possível remover o cartão."
          ]}
        />
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Meus cartões</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cardUsage.map((card) => (
            (() => {
              const brandColor = getCardBrandColor(card.name, card.brandColor)
              const isExpanded = expandedCardId === card.id
              return (
            <div
              key={card.id}
              className="w-full self-start rounded-xl border p-2.5 select-none"
              style={{
                aspectRatio: isExpanded ? undefined : "2.2 / 1",
                borderColor: hexToRgba(brandColor, 0.65),
                background: `linear-gradient(135deg, ${hexToRgba(brandColor, 0.22)}, var(--card-gradient-end))`
              }}
              onDoubleClick={(event: MouseEvent<HTMLElement>) => {
                const target = event.target as HTMLElement
                if (target.closest("input, select, button, textarea")) {
                  return
                }
                setExpandedCardId((currentCardId) =>
                  currentCardId === card.id ? null : card.id
                )
                if (expandedCardId === card.id) {
                  clearInvoiceTotalDraft(card.id)
                }
              }}
            >
              <div className="flex h-full flex-col justify-between">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="block max-w-[48%] truncate whitespace-nowrap text-sm font-medium text-zinc-100">
                    {card.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-zinc-100">
                      Fechamento {card.closeDay} | Vencimento {card.dueDay}
                    </span>
                    {card.logoUrl ? (
                      <img
                        src={card.logoUrl}
                        alt={card.name}
                        className="h-6 w-6 rounded-full bg-white/90 object-contain p-0.5"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: brandColor }} />
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <div className="mt-2 grid gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/30 p-2">
                    <label className="grid gap-1 text-[11px] uppercase tracking-wide text-zinc-400">
                      Limite total
                      <input
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs normal-case text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                        type="text"
                        inputMode="decimal"
                        value={formatCurrencyFromNumber(card.limitTotal)}
                        onChange={(event) =>
                          updateCardField(
                            card,
                            "limitTotal",
                            String(parseCurrencyInput(event.target.value))
                          )
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-[11px] uppercase tracking-wide text-zinc-400">
                      Valor total da fatura
                      <input
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs normal-case text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                        type="text"
                        inputMode="decimal"
                        value={getInvoiceTotalDraft(card.id) ?? formatCurrencyFromNumber(card.currentInvoice)}
                        onFocus={() =>
                          setInvoiceTotalDraft(card.id, formatCurrencyFromNumber(card.currentInvoice))
                        }
                        onChange={(event) =>
                          setInvoiceTotalDraft(card.id, formatCurrencyInput(event.target.value))
                        }
                        onBlur={() => commitInvoiceTotalFromDraft(card)}
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="grid gap-1 text-[11px] uppercase tracking-wide text-zinc-400">
                        Dia de fechamento
                        <select
                          size={1}
                          className="h-10 max-h-10 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs normal-case text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                          value={String(card.closeDay)}
                          onChange={(event) =>
                            updateCardField(card, "closeDay", event.target.value)
                          }
                        >
                          {dayOptions.map((day) => (
                            <option key={`card-close-${card.id}-${day}`} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-[11px] uppercase tracking-wide text-zinc-400">
                        Dia de vencimento
                        <select
                          size={1}
                          className="h-10 max-h-10 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs normal-case text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                          value={String(card.dueDay)}
                          onChange={(event) => updateCardField(card, "dueDay", event.target.value)}
                        >
                          {dayOptions.map((day) => (
                            <option key={`card-due-${card.id}-${day}`} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="inline-flex items-center justify-center rounded-xl border border-red-500/60 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/25"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          handleRemoveCard(card.id)
                        }}
                        type="button"
                      >
                        Remover cartão
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          commitInvoiceTotalFromDraft(card)
                          setExpandedCardId(null)
                        }}
                        type="button"
                        aria-label="Salvar cartão"
                        title="Salvar cartão"
                      >
                        <Check size={14} />
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1 h-2 w-full rounded-full bg-zinc-800">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${card.usagePercentage}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-100">
                      <span>
                        Usado: <NumberTicker className="font-black" value={card.used} format={formatCurrency} />
                      </span>
                      <span>
                        Disponível:{" "}
                        <NumberTicker className="font-black" value={card.available} format={formatCurrency} />
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-zinc-100">
                        Fatura atual: {formatCurrency(card.currentInvoice)}
                      </p>
                      <button
                        type="button"
                        onClick={() => openCardInvoice(card.id)}
                        className="text-[11px] text-zinc-500 underline-offset-2 transition hover:text-zinc-300 hover:underline"
                      >
                        Ver fatura
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
              )
            })()
          ))}
          <div
            className="w-full self-start rounded-xl border border-zinc-700/80 bg-zinc-950 p-2.5"
            style={{ aspectRatio: showAddCardForm ? undefined : "2.2 / 1" }}
          >
            {!showAddCardForm ? (
              <button
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400 transition hover:text-zinc-200"
                onClick={() => setShowAddCardForm(true)}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-200">
                  <Plus size={20} />
                </span>
                <span className="text-xs font-medium">Adicionar cartão</span>
              </button>
            ) : (
              <div className="grid gap-2">
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 pr-8 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                    type="text"
                    placeholder="Pesquisar banco"
                    value={bankSearch}
                    onFocus={() => setShowBankOptions(true)}
                    onChange={(event) => {
                      setBankSearch(event.target.value)
                      setShowBankOptions(true)
                    }}
                  />
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"
                    type="button"
                    onClick={() => setShowBankOptions((current) => !current)}
                  >
                    <ChevronDown size={14} />
                  </button>
                  {showBankOptions && (
                    <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1">
                      {filteredBankOptions.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-zinc-500">Nenhum banco encontrado</div>
                      )}
                      {filteredBankOptions.map((bank) => (
                        <button
                          key={bank.id}
                          className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-zinc-200 transition hover:bg-zinc-800"
                          type="button"
                          onClick={() => {
                            setSelectedBankId(bank.id)
                            setBankSearch(bank.name)
                            setShowBankOptions(false)
                          }}
                        >
                          {bank.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  type="text"
                  inputMode="decimal"
                  placeholder="Limite"
                  value={newCardLimit}
                  onChange={(event) => setNewCardLimit(formatCurrencyInput(event.target.value))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    size={1}
                    className="h-10 max-h-10 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                    value={newCardCloseDay}
                    onChange={(event) => setNewCardCloseDay(event.target.value)}
                  >
                    <option value="">Fech.</option>
                    {dayOptions.map((day) => (
                      <option key={`home-close-${day}`} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                  <select
                    size={1}
                    className="h-10 max-h-10 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                    value={newCardDueDay}
                    onChange={(event) => setNewCardDueDay(event.target.value)}
                  >
                    <option value="">Venc.</option>
                    {dayOptions.map((day) => (
                      <option key={`home-due-${day}`} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                    onClick={() => setShowAddCardForm(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="rounded-xl bg-emerald-500 px-2 py-2 text-xs font-medium text-white transition hover:bg-emerald-400"
                    onClick={handleAddCard}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      <CardInvoiceModal
        isOpen={Boolean(selectedInvoiceCard)}
        cardName={selectedInvoiceCard?.name || ""}
        monthKey={currentMonth}
        currentInvoice={selectedInvoiceCard?.currentInvoice || 0}
        manualAdjustmentValue={selectedInvoiceCard?.manualInvoiceAmount || 0}
        transactions={selectedInvoiceTransactions}
        plannedItems={selectedInvoicePlannedItems}
        onClose={closeCardInvoice}
        onSaveManualAdjustment={(value) => {
          if (!selectedInvoiceCard) {
            return
          }
          saveManualInvoiceAdjustment(selectedInvoiceCard.id, value)
        }}
        onRemoveManualAdjustment={() => {
          if (!selectedInvoiceCard) {
            return
          }
          removeManualInvoiceAdjustment(selectedInvoiceCard.id)
        }}
        onMarkAsPaid={() => {
          if (!selectedInvoiceCard) {
            return
          }
          markInvoiceAsPaid(selectedInvoiceCard)
        }}
        onOpenTransactions={() => {
          if (!selectedInvoiceCard) {
            return
          }
          openTransactionsForInvoice(selectedInvoiceCard.id)
        }}
        onAddExpense={() => {
          if (!selectedInvoiceCard) {
            return
          }
          openAddExpenseForInvoice(selectedInvoiceCard.id)
        }}
      />
    </section>
  )
}
