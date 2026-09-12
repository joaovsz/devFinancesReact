import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Activity,
  Beef,
  BriefcaseBusiness,
  ChartLine,
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
  getInstallmentTotalForMonth,
  getMonthLabel,
  isCardInvoicePaidForMonth,
  isFixedCostActiveForMonth
} from "../utils/projections"
import { isTransactionInOperationalMonth } from "../utils/domain/transactions"
import {
  CreditCardInvoicePlannedItem,
  getCreditCardInvoicePlannedItems,
  getCreditCardInvoiceTransactions,
  getCreditCardUsageSummaries
} from "../utils/domain/creditCards"
import { buildPlannedEntriesForMonth } from "../utils/planningEntries"
import { useTransactionStore } from "../store/useTransactionStore"
import { NumberTicker } from "./magic/NumberTicker"
import { formatCurrency } from "./Transactions"
import { bankPresets, BankPreset } from "../data/banks"
import { selectTotalMonthlyContribution, useGoalStore } from "../store/useGoalStore"
import { fetchBankInstitutions } from "../services/banks"
import { CreditCard as CardType } from "../types/card"
import { DismissibleInfoCard } from "./ui/DismissibleInfoCard"
import { CardInvoiceModal } from "./cards/CardInvoiceModal"
import { CardModal, PRESET_BRAND_COLORS } from "./cards/CardModal"
import { defaultCategories } from "../data/categories"
import { echarts } from "../utils/echarts"
import { creditCardSchema } from "../schemas"

export { PRESET_BRAND_COLORS }

type CategoryExpenseBucket = {
  categoryId: string
  subcategoryId: string
  value: number
}

type CategoryDrillItem = {
  id: string
  label: string
  value: number
}

export const Cards = () => {
  const navigate = useNavigate()
  const cards = useTransactionStore((state) => state.cards)
  const transactions = useTransactionStore((state) => state.transactions)
  const fixedCosts = useTransactionStore((state) => state.fixedCosts)
  const installmentPlans = useTransactionStore((state) => state.installmentPlans)
  const contractConfig = useTransactionStore((state) => state.contractConfig)
  const activeMonthKey = useTransactionStore((state) => state.activeMonthKey)
  const totalIncomes = useTransactionStore((state) => state.totalIncomes)
  const totalExpenses = useTransactionStore((state) => state.totalExpenses)
  const goalsMonthlyContribution = useGoalStore(selectTotalMonthlyContribution)
  const addCard = useTransactionStore((state) => state.addCard)
  const updateCard = useTransactionStore((state) => state.updateCard)
  const removeCard = useTransactionStore((state) => state.removeCard)
  const markCardInvoiceAsPaid = useTransactionStore(
    (state) => state.markCardInvoiceAsPaid
  )
  const setCardManualInvoiceAmountForMonth = useTransactionStore(
    (state) => state.setCardManualInvoiceAmountForMonth
  )
  const clearCardManualInvoiceAmountForMonth = useTransactionStore(
    (state) => state.clearCardManualInvoiceAmountForMonth
  )
  const currentMonth = activeMonthKey
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [institutions, setInstitutions] = useState<BankPreset[]>(bankPresets)
  const [cardModalState, setCardModalState] = useState<{
    isOpen: boolean
    card: CardType | null
  }>({ isOpen: false, card: null })
  const [invoiceCardId, setInvoiceCardId] = useState<string | null>(null)
  const [selectedCategoryDrillId, setSelectedCategoryDrillId] = useState<string | null>(null)
  const [themeVersion, setThemeVersion] = useState(0)

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
    })

    return () => {
      ignore = true
    }
  }, [])

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

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  const cardUsage = useMemo(
    () =>
      getCreditCardUsageSummaries({
        cards,
        transactions,
        fixedCosts,
        installmentPlans,
        monthKey: currentMonth
      }),
    [cards, transactions, fixedCosts, installmentPlans, currentMonth]
  )
  const selectedInvoiceCard = cardUsage.find((card) => card.id === invoiceCardId) || null
  const isSelectedInvoicePaid = selectedInvoiceCard
    ? isCardInvoicePaidForMonth(selectedInvoiceCard, currentMonth)
    : false
  const selectedInvoiceTransactions = useMemo(
    () => {
      if (!invoiceCardId) {
        return []
      }

      const selectedCard = cards.find((card) => card.id === invoiceCardId)
      if (!selectedCard) {
        return []
      }

      return getCreditCardInvoiceTransactions({
        card: selectedCard,
        transactions,
        monthKey: currentMonth
      })
    },
    [transactions, invoiceCardId, currentMonth, cards]
  )
  const selectedInvoicePlannedItems = useMemo<CreditCardInvoicePlannedItem[]>(
    () => {
      if (!invoiceCardId) {
        return []
      }

      const selectedCard = cards.find((card) => card.id === invoiceCardId)
      if (!selectedCard) {
        return []
      }

      return getCreditCardInvoicePlannedItems({
        card: selectedCard,
        fixedCosts,
        installmentPlans,
        monthKey: currentMonth
      })
    },
    [
      cards,
      fixedCosts,
      installmentPlans,
      invoiceCardId,
      currentMonth
    ]
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
      .filter((transaction) => {
        return transaction.type === 2 && isTransactionInOperationalMonth({
          transaction,
          cards,
          monthKey: currentMonth
        })
      })
      .forEach((transaction) => {
        addExpense(transaction.categoryId, transaction.subcategoryId, transaction.value)
      })

    fixedCosts.filter((cost) => isFixedCostActiveForMonth(cost, currentMonth)).forEach((cost) => {
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
  const selectedCategoryItems = useMemo<CategoryDrillItem[]>(() => {
    if (!selectedCategoryDrillId) {
      return []
    }

    const items: CategoryDrillItem[] = []

    transactions
      .filter((transaction) => {
        if (transaction.type !== 2 || transaction.categoryId !== selectedCategoryDrillId) {
          return false
        }

        return isTransactionInOperationalMonth({
          transaction,
          cards,
          monthKey: currentMonth
        })
      })
      .sort((left, right) => right.date.localeCompare(left.date))
      .forEach((transaction) => {
        items.push({
          id: `transaction-${transaction.id}`,
          label: transaction.label,
          value: transaction.value
        })
      })

    fixedCosts
      .filter(
        (cost) =>
          cost.categoryId === selectedCategoryDrillId &&
          isFixedCostActiveForMonth(cost, currentMonth)
      )
      .forEach((cost) => {
        items.push({
          id: `fixed-${cost.id}`,
          label: cost.name,
          value: cost.amount
        })
      })

    if (selectedCategoryDrillId === "__installments") {
      installmentPlans
        .filter((plan) => getInstallmentTotalForMonth([plan], currentMonth) > 0)
        .forEach((plan) => {
          items.push({
            id: `installment-${plan.id}`,
            label: plan.name,
            value: plan.installmentValue
          })
        })
    }

    return items
  }, [selectedCategoryDrillId, transactions, cards, fixedCosts, installmentPlans, currentMonth])

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
    const lower = cardName.toLowerCase()
    if (lower.includes("ourocard")) {
      return "#FFCD00"
    }
    if (
      lower.includes("azul") &&
      (!currentColor ||
        currentColor === "#005183" ||
        currentColor === "#64748B" ||
        currentColor === "#10B981" ||
        currentColor === "#EC7000")
    ) {
      return "#002C6C"
    }
    return currentColor || "#10B981"
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

  function handleOpenAddCard() {
    setCardModalState({ isOpen: true, card: null })
  }

  function handleOpenEditCard(card: CardType) {
    setCardModalState({ isOpen: true, card })
  }

  function handleCloseCardModal() {
    setCardModalState({ isOpen: false, card: null })
  }

  function handleSaveCard(cardData: {
    id?: string
    bankId?: string
    name: string
    brandColor: string
    logoUrl?: string
    limitTotal: number
    closeDay: number
    dueDay: number
  }) {
    if (cardData.id) {
      const existingCard = cards.find((c) => c.id === cardData.id)
      if (!existingCard) return
      const updated = {
        ...existingCard,
        bankId: cardData.bankId || existingCard.bankId,
        name: cardData.name,
        brandColor: cardData.brandColor,
        logoUrl: cardData.logoUrl,
        limitTotal: cardData.limitTotal,
        closeDay: cardData.closeDay,
        dueDay: cardData.dueDay
      }
      const parsed = creditCardSchema.safeParse(updated)
      if (parsed.success) {
        updateCard(parsed.data)
      }
    } else {
      const newCard = {
        id: crypto.randomUUID(),
        bankId: cardData.bankId || "other",
        name: cardData.name,
        brandColor: cardData.brandColor,
        logoUrl: cardData.logoUrl,
        limitTotal: cardData.limitTotal,
        closeDay: cardData.closeDay,
        dueDay: cardData.dueDay,
        manualInvoiceAmount: 0
      }
      const parsed = creditCardSchema.safeParse(newCard)
      if (parsed.success) {
        addCard(parsed.data)
      }
    }
  }

  function handleRemoveCard(cardId: string) {
    removeCard(cardId)
    if (invoiceCardId === cardId) {
      setInvoiceCardId(null)
    }
    handleCloseCardModal()
  }

  function openCardInvoice(cardId: string) {
    setInvoiceCardId(cardId)
  }

  function closeCardInvoice() {
    setInvoiceCardId(null)
  }

  function openTransactionsForInvoice(cardId: string) {
    closeCardInvoice()
    navigate(`/transacoes?cardId=${cardId}&source=invoice`)
  }

  function openAddExpenseForInvoice(cardId: string) {
    closeCardInvoice()
    navigate(`/transacoes?cardId=${cardId}&action=add-expense`)
  }

  function saveManualInvoiceAdjustment(cardId: string, value: number) {
    setCardManualInvoiceAmountForMonth(cardId, currentMonth, value)
  }

  function removeManualInvoiceAdjustment(cardId: string) {
    clearCardManualInvoiceAmountForMonth(cardId, currentMonth)
  }

  function markInvoiceAsPaid(card: CardType) {
    if (isCardInvoicePaidForMonth(card, currentMonth)) {
      return
    }

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
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
            <ReactEChartsCore
              echarts={echarts}
              option={categoryDistributionOption}
              onEvents={categoryDistributionEvents}
              style={{ height: 340, width: "100%" }}
              notMerge
              lazyUpdate
            />
            <div className="h-[340px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
              {hasDrilldown ? (
                <>
                  <div className="border-b border-zinc-800 px-3 py-2.5 text-xs uppercase tracking-wide text-zinc-500">
                    Itens da categoria
                  </div>
                  <div className="h-[307px] overflow-y-auto pb-2">
                    {selectedCategoryItems.length > 0 ? (
                      selectedCategoryItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 border-b border-zinc-800 px-3 py-2.5 text-sm last:border-b-0"
                        >
                          <span className="min-w-0 truncate text-zinc-200">{item.label}</span>
                          <span className="shrink-0 font-semibold text-zinc-100">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-zinc-500">
                        Nenhum lançamento detalhado para esta categoria no mês.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {activeCategoryDonutData.slice(0, 6).map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5 text-sm last:border-b-0">
                      <span className="flex min-w-0 items-center gap-2 text-zinc-300">
                        {(() => {
                          const Icon = getCategoryIcon(item.id)
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
                </>
              )}
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
              <div className="min-w-0">
                <span className="truncate text-zinc-300">{card.name}</span>
                <p className="text-[10px] text-zinc-500">
                  Lançada: {formatCurrency(card.postedInvoice)}
                </p>
              </div>
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
            "Clique em 'Editar' ou dê duplo clique no cartão para abrir a edição.",
            "Você pode alterar limite, fechamento, vencimento, cor da marca ou remover.",
            "Acompanhe o limite e faturas previstas vs. lançadas em tempo real."
          ]}
        />
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Meus cartões</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cardUsage.map((card) => {
            const brandColor = getCardBrandColor(card.name, card.brandColor)
            return (
              <div
                key={card.id}
                className="group relative w-full self-start rounded-xl border p-2.5 select-none transition hover:border-zinc-500"
                style={{
                  aspectRatio: "2.2 / 1",
                  borderColor: hexToRgba(brandColor, 0.65),
                  background: `linear-gradient(135deg, ${hexToRgba(brandColor, 0.22)}, var(--card-gradient-end))`
                }}
                onDoubleClick={() => handleOpenEditCard(card)}
              >
                <div className="flex h-full flex-col justify-between">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-zinc-100" title={card.name}>
                      {card.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[9px] text-zinc-300">
                        Fech. {card.closeDay} | Venc. {card.dueDay}
                      </span>
                      {card.logoUrl ? (
                        <img
                          src={card.logoUrl}
                          alt={card.name}
                          className="h-6 w-6 rounded-full bg-white object-contain p-0.5 shadow-sm"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none"
                          }}
                        />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: brandColor }} />
                      )}
                    </div>
                  </div>

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
                      <div className="text-[11px] font-bold text-zinc-100">
                        <p>Fatura prevista: {formatCurrency(card.currentInvoice)}</p>
                        <p className="font-medium text-zinc-300">
                          Lançada: {formatCurrency(card.postedInvoice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCard(card)}
                          className="text-[11px] text-zinc-400 underline-offset-2 transition hover:text-zinc-200 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => openCardInvoice(card.id)}
                          className="text-[11px] text-zinc-500 underline-offset-2 transition hover:text-zinc-300 hover:underline"
                        >
                          Ver fatura
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div
            className="w-full self-start rounded-xl border border-zinc-700/80 bg-zinc-950 p-2.5"
            style={{ aspectRatio: "2.2 / 1" }}
          >
            <button
              className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400 transition hover:text-zinc-200"
              onClick={handleOpenAddCard}
              type="button"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-200">
                <Plus size={20} />
              </span>
              <span className="text-xs font-medium">Adicionar cartão</span>
            </button>
          </div>
        </div>
      </article>

      <CardModal
        isOpen={cardModalState.isOpen}
        editingCard={cardModalState.card}
        institutions={institutions}
        onClose={handleCloseCardModal}
        onSave={handleSaveCard}
        onRemove={handleRemoveCard}
      />

      <CardInvoiceModal
        isOpen={Boolean(selectedInvoiceCard)}
        cardName={selectedInvoiceCard?.name || ""}
        monthKey={currentMonth}
        currentInvoice={selectedInvoiceCard?.currentInvoice || 0}
        postedInvoice={selectedInvoiceCard?.postedInvoice || 0}
        manualAdjustmentValue={selectedInvoiceCard?.manualInvoiceAmount || 0}
        isPaid={isSelectedInvoicePaid}
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
