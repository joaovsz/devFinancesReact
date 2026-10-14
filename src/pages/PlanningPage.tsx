import { InputHTMLAttributes, SelectHTMLAttributes, useEffect, useMemo, useRef, useState } from "react"
import { Path, PathValue, useForm } from "react-hook-form"
import {
  BadgeDollarSign,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  CreditCard,
  FolderTree,
  Hash,
  LucideIcon,
  Pencil,
  Plus,
  Save,
  Square,
  SquareCheck,
  Tag,
  Trash2,
  Wallet,
  X
} from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { defaultCategories } from "../data/categories"
import { useTransactionStore } from "../store/useTransactionStore"
import { formatCurrency } from "../components/Transactions"
import {
  getFixedCostAmountForMonth,
  getFixedCostRevenueBaseForMonth,
  getInstallmentProgress,
  getMonthLabel
} from "../utils/projections"
import { PaymentMethod } from "../types/transaction"
import { InstallmentPlan } from "../types/planning"
import {
  formatCurrencyFromNumber,
  formatCurrencyInput,
  parseCurrencyInput
} from "../utils/currency-input"
import {
  fixedExpenseFormSchema,
  fixedExpenseSchema,
  installmentFormSchema,
  installmentSchema
} from "../schemas"
import { FixedExpenseFormValues, InstallmentFormValues } from "../types/forms"

const selectClassName =
  "w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
const inputClassName =
  "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
const numberInputClassName =
  `${inputClassName} w-24 shrink-0 appearance-none text-left [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`
const installmentTotalChips = [1, 2, 3, 6, 12]
// Lists show 5 rows collapsed; expanded, 10 rows fit before the list scrolls
const COLLAPSED_LIST_ITEMS = 5
const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Conta" },
  { value: "debit", label: "Débito" },
  { value: "pix", label: "Pix" },
  { value: "bank-transfer", label: "Transferência" },
  { value: "bank-slip", label: "Boleto" },
  { value: "cash-money", label: "Dinheiro" },
  { value: "credit", label: "Cartão de crédito" }
]
const incomeLabelClassName = "grid min-w-0 gap-1 text-sm text-zinc-400"
const competenceOffsetOptions = [
  { value: 0, label: "Mesmo mês do recebimento" },
  { value: 1, label: "Mês anterior" }
]

type PlanningPageProps = {
  embedded?: boolean
}

type IconFieldProps = {
  icon?: LucideIcon
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & IconFieldProps
type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & IconFieldProps

function getDefaultExpenseCategory() {
  return defaultCategories.find((category) => category.id !== "rendas") || defaultCategories[0]
}

function getDefaultFixedFormValues(firstCardId: string): FixedExpenseFormValues {
  const category = getDefaultExpenseCategory()
  return {
    name: "",
    amount: "",
    categoryId: category.id,
    subcategoryId: category.subcategories[0].id,
    dueDay: "",
    dueOffsetMonths: "0",
    chargeDay: "",
    paymentMethod: "cash",
    cardId: firstCardId
  }
}

function getDefaultInstallmentFormValues(
  firstCardId: string,
  activeMonthKey: string
): InstallmentFormValues {
  return {
    name: "",
    value: "",
    total: "",
    paid: "0",
    paymentMethod: "cash",
    cardId: firstCardId,
    chargeDay: "",
    dueOffsetMonths: "0",
    startMonth: activeMonthKey
  }
}

function SelectField({ icon: Icon, ...props }: SelectFieldProps) {
  return (
    <div className="relative w-full min-w-0">
      {Icon && (
        <Icon
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />
      )}
      <select
        {...props}
        className={`${selectClassName} ${Icon ? "pl-10" : ""} ${props.className || ""}`.trim()}
      />
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
      />
    </div>
  )
}

function InputField({ icon: Icon, ...props }: InputFieldProps) {
  return (
    <div className="relative w-full min-w-0">
      {Icon && (
        <Icon
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />
      )}
      <input
        {...props}
        className={`${props.className || inputClassName} ${Icon ? "pl-10" : ""}`.trim()}
      />
    </div>
  )
}

export const PlanningPage = ({ embedded = false }: PlanningPageProps) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const cards = useTransactionStore((state) => state.cards)
  const transactions = useTransactionStore((state) => state.transactions)
  const fixedCosts = useTransactionStore((state) => state.fixedCosts)
  const installmentPlans = useTransactionStore((state) => state.installmentPlans)
  const contractConfig = useTransactionStore((state) => state.contractConfig)
  const activeMonthKey = useTransactionStore((state) => state.activeMonthKey)
  const addFixedCost = useTransactionStore((state) => state.addFixedCost)
  const updateFixedCost = useTransactionStore((state) => state.updateFixedCost)
  const removeFixedCost = useTransactionStore((state) => state.removeFixedCost)
  const stopFixedCost = useTransactionStore((state) => state.stopFixedCost)
  const addInstallmentPlan = useTransactionStore((state) => state.addInstallmentPlan)
  const updateInstallmentPlan = useTransactionStore((state) => state.updateInstallmentPlan)
  const removeInstallmentPlan = useTransactionStore((state) => state.removeInstallmentPlan)
  const updateContractConfig = useTransactionStore((state) => state.updateContractConfig)

  const firstCardId = cards[0]?.id || ""

  const {
    handleSubmit: handleSubmitFixed,
    reset: resetFixedForm,
    setError: setFixedFormError,
    setValue: setFixedFormValue,
    watch: watchFixedForm,
    formState: { errors: fixedFormErrors }
  } = useForm<FixedExpenseFormValues>({
    defaultValues: getDefaultFixedFormValues(firstCardId)
  })
  const fixedForm = watchFixedForm()
  const [editingFixedCostId, setEditingFixedCostId] = useState("")

  const {
    handleSubmit: handleSubmitInstallment,
    reset: resetInstallmentForm,
    setError: setInstallmentFormError,
    setValue: setInstallmentFormValue,
    watch: watchInstallmentForm,
    formState: { errors: installmentFormErrors }
  } = useForm<InstallmentFormValues>({
    defaultValues: getDefaultInstallmentFormValues(firstCardId, activeMonthKey)
  })
  const installmentForm = watchInstallmentForm()
  const [editingInstallmentId, setEditingInstallmentId] = useState("")
  const fixedName = fixedForm.name
  const fixedAmount = fixedForm.amount
  const fixedCategoryId = fixedForm.categoryId
  const fixedSubcategoryId = fixedForm.subcategoryId
  const fixedDueDay = fixedForm.dueDay
  const fixedDueOffsetMonths = fixedForm.dueOffsetMonths
  const fixedChargeDay = fixedForm.chargeDay
  const fixedPaymentMethod = fixedForm.paymentMethod
  const fixedCardId = fixedForm.cardId
  const installmentName = installmentForm.name
  const installmentValue = installmentForm.value
  const installmentTotal = installmentForm.total
  const installmentPaid = installmentForm.paid
  const installmentPaymentMethod = installmentForm.paymentMethod
  const installmentCardId = installmentForm.cardId
  const installmentChargeDay = installmentForm.chargeDay
  const installmentDueOffsetMonths = installmentForm.dueOffsetMonths
  const installmentStartMonth = installmentForm.startMonth

  function updateFixedField<K extends Path<FixedExpenseFormValues>>(
    name: K,
    value: PathValue<FixedExpenseFormValues, K>
  ) {
    setFixedFormValue(name, value, { shouldDirty: true })
  }

  function updateInstallmentField<K extends Path<InstallmentFormValues>>(
    name: K,
    value: PathValue<InstallmentFormValues, K>
  ) {
    setInstallmentFormValue(name, value, { shouldDirty: true })
  }

  function setFixedName(value: string) {
    updateFixedField("name", value)
  }

  function setFixedAmount(value: string) {
    updateFixedField("amount", value)
  }

  function setFixedCategoryId(value: string) {
    updateFixedField("categoryId", value)
  }

  function setFixedSubcategoryId(value: string) {
    updateFixedField("subcategoryId", value)
  }

  function setFixedDueDay(value: string) {
    updateFixedField("dueDay", value)
  }

  function setFixedDueOffsetMonths(value: string) {
    updateFixedField("dueOffsetMonths", value)
  }

  function setFixedChargeDay(value: string) {
    updateFixedField("chargeDay", value)
  }

  function setFixedPaymentMethod(value: PaymentMethod) {
    updateFixedField("paymentMethod", value)
  }

  function setFixedCardId(value: string) {
    updateFixedField("cardId", value)
  }

  function setInstallmentName(value: string) {
    updateInstallmentField("name", value)
  }

  function setInstallmentValue(value: string) {
    updateInstallmentField("value", value)
  }

  function setInstallmentTotal(value: string | ((current: string) => string)) {
    updateInstallmentField(
      "total",
      typeof value === "function" ? value(installmentTotal) : value
    )
  }

  function setInstallmentPaid(value: string) {
    updateInstallmentField("paid", value)
  }

  function setInstallmentPaymentMethod(value: PaymentMethod) {
    updateInstallmentField("paymentMethod", value)
  }

  function setInstallmentCardId(value: string) {
    updateInstallmentField("cardId", value)
  }

  function setInstallmentChargeDay(value: string) {
    updateInstallmentField("chargeDay", value)
  }

  function setInstallmentDueOffsetMonths(value: string) {
    updateInstallmentField("dueOffsetMonths", value)
  }

  function setInstallmentStartMonth(value: string) {
    updateInstallmentField("startMonth", value)
  }

  const [hourlyRateInput, setHourlyRateInput] = useState(
    formatCurrencyFromNumber(contractConfig.hourlyRate)
  )
  const [cltNetSalaryInput, setCltNetSalaryInput] = useState(
    formatCurrencyFromNumber(contractConfig.cltNetSalary)
  )

  // The automatic revenue tax (e.g. DAS) is stored as a regular FixedCost
  // under the hood, but it's configured here in Faturamento mensal instead
  // of in Gastos fixos — it's excluded from that list.
  const autoTaxFixedCost = fixedCosts.find(
    (cost) => cost.amountMode === "percentageOfRevenue" && !cost.endMonth
  )
  const [autoTaxPercentageInput, setAutoTaxPercentageInput] = useState(
    autoTaxFixedCost?.revenuePercentage ? String(autoTaxFixedCost.revenuePercentage) : ""
  )
  const autoTaxRevenueBase = getFixedCostRevenueBaseForMonth({
    transactions,
    contractConfig,
    monthKey: activeMonthKey
  })
  const autoTaxPreviewAmount = getFixedCostAmountForMonth(
    {
      amount: 0,
      amountMode: "percentageOfRevenue",
      revenuePercentage: Number(autoTaxPercentageInput.replace(",", ".")) || 0
    },
    autoTaxRevenueBase
  )

  function commitAutoTaxPercentage(rawValue: string) {
    const percentage = Number(rawValue.replace(",", ".")) || 0

    if (percentage <= 0) {
      setAutoTaxPercentageInput("")
      if (autoTaxFixedCost) {
        stopFixedCost(autoTaxFixedCost.id)
      }
      return
    }

    const resolvedAmount = getFixedCostAmountForMonth(
      { amount: 0, amountMode: "percentageOfRevenue", revenuePercentage: percentage },
      autoTaxRevenueBase
    )

    if (autoTaxFixedCost) {
      updateFixedCost({
        ...autoTaxFixedCost,
        revenuePercentage: percentage,
        amount: resolvedAmount
      })
      return
    }

    addFixedCost({
      id: crypto.randomUUID(),
      name: "Imposto sobre faturamento",
      amount: resolvedAmount,
      amountMode: "percentageOfRevenue",
      revenuePercentage: percentage,
      startMonth: activeMonthKey,
      categoryId: "impostos-empresa",
      subcategoryId: "das",
      paymentMethod: "pix"
    })
  }

  const [wizardStep, setWizardStep] = useState<0 | 1>(0)
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "fixed"; id: string; label: string }
    | { kind: "installment"; id: string; label: string }
    | null
  >(null)
  const [highlightedSection, setHighlightedSection] = useState<"income" | "fixed" | "installment" | null>(null)
  const incomeSectionRef = useRef<HTMLDivElement | null>(null)
  const fixedSectionRef = useRef<HTMLDivElement | null>(null)
  const installmentSectionRef = useRef<HTMLDivElement | null>(null)
  const highlightTimeoutRef = useRef<number | null>(null)

  const selectedFixedCategory = useMemo(
    () =>
      defaultCategories.find((category) => category.id === fixedCategoryId) ||
      defaultCategories[0],
    [fixedCategoryId]
  )
  // The form takes the purchase total; each installment is the total split evenly
  const installmentValuePreview =
    Math.round(((parseCurrencyInput(installmentValue) || 0) / Math.max(Number(installmentTotal || 1), 1)) * 100) / 100
  const installmentProgressPreview = useMemo(
    () =>
      getInstallmentProgress(
        {
          id: editingInstallmentId || "preview-installment",
          name: installmentName || "Parcelamento",
          installmentValue: installmentValuePreview,
          totalInstallments: Math.max(Number(installmentTotal || 1), 1),
          paidInstallments: Math.max(Number(installmentPaid || 0), 0),
          startMonth: installmentStartMonth,
          chargeDay: installmentChargeDay ? Number(installmentChargeDay) : undefined,
          paymentMethod: installmentPaymentMethod,
          cardId: installmentPaymentMethod === "credit" ? installmentCardId || undefined : undefined
        },
        activeMonthKey
      ),
    [
      activeMonthKey,
      editingInstallmentId,
      installmentName,
      installmentValuePreview,
      installmentTotal,
      installmentPaid,
      installmentStartMonth,
      installmentChargeDay,
      installmentPaymentMethod,
      installmentCardId
    ]
  )

  function flashSection(section: "income" | "fixed" | "installment") {
    setHighlightedSection(section)
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current)
    }
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedSection((current) => (current === section ? null : current))
      highlightTimeoutRef.current = null
    }, 2200)
  }

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!editingFixedCostId) {
      setFixedChargeDay("")
    }
  }, [editingFixedCostId, activeMonthKey])

  useEffect(() => {
    if (!editingInstallmentId) {
      setInstallmentStartMonth(activeMonthKey)
      setInstallmentChargeDay("")
    }
  }, [editingInstallmentId, activeMonthKey])

  useEffect(() => {
    const editingId = searchParams.get("editFixedCostId")
    if (!editingId) {
      return
    }

    setWizardStep(0)

    const cost = fixedCosts.find((item) => item.id === editingId)
    if (!cost) {
      return
    }

    setEditingFixedCostId(cost.id)
    setFixedName(cost.name)
    setFixedAmount(formatCurrencyFromNumber(cost.amount))
    setFixedCategoryId(cost.categoryId)
    setFixedSubcategoryId(cost.subcategoryId)
    setFixedDueDay(cost.dueDay ? String(cost.dueDay) : "")
    setFixedDueOffsetMonths(String(cost.dueOffsetMonths || 0))
    setFixedChargeDay(cost.chargeDay ? String(cost.chargeDay) : "")
    setFixedPaymentMethod(cost.paymentMethod)
    setFixedCardId(cost.cardId || firstCardId)
  }, [searchParams, fixedCosts, firstCardId])

  useEffect(() => {
    const editIncome = searchParams.get("editIncome")
    if (editIncome !== "1") {
      return
    }

    flashSection("income")
    requestAnimationFrame(() => {
      incomeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }, [searchParams])

  useEffect(() => {
    const editingId = searchParams.get("editFixedCostId")
    if (!editingId || wizardStep !== 0) {
      return
    }

    flashSection("fixed")
    requestAnimationFrame(() => {
      fixedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [searchParams, wizardStep])

  useEffect(() => {
    const editingId = searchParams.get("editInstallmentId")
    if (!editingId) {
      return
    }

    setWizardStep(1)

    const plan = installmentPlans.find((item) => item.id === editingId)
    if (!plan) {
      return
    }

    setEditingInstallmentId(plan.id)
    setInstallmentName(plan.name)
    setInstallmentValue(formatCurrencyFromNumber(plan.installmentValue * plan.totalInstallments))
    setInstallmentTotal(String(plan.totalInstallments))
    setInstallmentPaid(String(plan.paidInstallments || 0))
    setInstallmentPaymentMethod(plan.paymentMethod)
    setInstallmentCardId(plan.cardId || firstCardId)
    setInstallmentChargeDay(plan.chargeDay ? String(plan.chargeDay) : "")
    setInstallmentDueOffsetMonths(String(plan.dueOffsetMonths || 0))
    setInstallmentStartMonth(plan.startMonth)
  }, [searchParams, installmentPlans, firstCardId])

  useEffect(() => {
    const editingId = searchParams.get("editInstallmentId")
    if (!editingId || wizardStep !== 1) {
      return
    }

    flashSection("installment")
    requestAnimationFrame(() => {
      installmentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [searchParams, wizardStep])

  const [showEndedFixed, setShowEndedFixed] = useState(false)
  const [showEndedInstallments, setShowEndedInstallments] = useState(false)
  const [isFixedListExpanded, setIsFixedListExpanded] = useState(false)
  const [isInstallmentListExpanded, setIsInstallmentListExpanded] = useState(false)

  const visibleFixedCosts = fixedCosts.filter((cost) => cost.amountMode !== "percentageOfRevenue")
  const endedFixedCount = visibleFixedCosts.filter((cost) => cost.endMonth).length
  const listedFixedCosts = visibleFixedCosts.filter((cost) => showEndedFixed || !cost.endMonth)

  const isInstallmentEnded = (plan: InstallmentPlan) =>
    !getInstallmentProgress(plan, activeMonthKey).isActive && plan.startMonth <= activeMonthKey
  const endedInstallmentCount = installmentPlans.filter(isInstallmentEnded).length
  const listedInstallments = installmentPlans.filter(
    (plan) => showEndedInstallments || !isInstallmentEnded(plan)
  )

  const activeFixedCostsTotal = visibleFixedCosts
    .filter((cost) => !cost.endMonth)
    .reduce((sum, cost) => sum + cost.amount, 0)

  function getCategoryLabel(categoryId: string, subcategoryId: string) {
    const category = defaultCategories.find((item) => item.id === categoryId)
    if (!category) {
      return "Sem categoria"
    }
    const subcategory = category.subcategories.find((item) => item.id === subcategoryId)
    return subcategory ? `${category.name} / ${subcategory.name}` : category.name
  }

  function getPaymentLabel(paymentMethod: PaymentMethod, cardId?: string) {
    if (paymentMethod !== "credit") {
      return (
        paymentMethodOptions.find((option) => option.value === paymentMethod)?.label ||
        "Conta"
      )
    }

    const card = cards.find((item) => item.id === cardId)
    return card ? `Crédito - ${card.name}` : "Crédito"
  }

  function addFixed(values: FixedExpenseFormValues) {
    const parsedForm = fixedExpenseFormSchema.safeParse(values)
    if (!parsedForm.success) {
      setFixedFormError("root", {
        message: parsedForm.error.issues[0]?.message || "Revise o gasto fixo."
      })
      return
    }

    const formData = parsedForm.data
    const nextFixedCost = {
      id: editingFixedCostId || crypto.randomUUID(),
      name: formData.name,
      amount: formData.amount,
      startMonth: editingFixedCostId ? undefined : activeMonthKey,
      dueOffsetMonths: formData.paymentMethod === "credit" ? undefined : formData.dueOffsetMonths,
      dueDay: formData.paymentMethod === "credit" ? undefined : formData.dueDay,
      chargeDay: formData.paymentMethod === "credit" ? formData.chargeDay : undefined,
      categoryId: formData.categoryId,
      subcategoryId: formData.subcategoryId,
      paymentMethod: formData.paymentMethod,
      cardId: formData.paymentMethod === "credit" ? formData.cardId : undefined
    }

    if (editingFixedCostId) {
      const target = fixedCosts.find((item) => item.id === editingFixedCostId)
      if (!target) {
        setEditingFixedCostId("")
        return
      }

      const parsedCost = fixedExpenseSchema.safeParse({
        ...target,
        ...nextFixedCost,
        startMonth: target.startMonth
      })
      if (!parsedCost.success) {
        setFixedFormError("root", {
          message: parsedCost.error.issues[0]?.message || "Revise o gasto fixo."
        })
        return
      }

      updateFixedCost(parsedCost.data)

      setEditingFixedCostId("")
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams)
        nextParams.delete("editFixedCostId")
        return nextParams
      })
    } else {
      const parsedCost = fixedExpenseSchema.safeParse(nextFixedCost)
      if (!parsedCost.success) {
        setFixedFormError("root", {
          message: parsedCost.error.issues[0]?.message || "Revise o gasto fixo."
        })
        return
      }
      addFixedCost(parsedCost.data)
    }

    resetFixedForm(getDefaultFixedFormValues(firstCardId))
  }

  function startEditingFixed(costId: string) {
    const cost = fixedCosts.find((item) => item.id === costId)
    if (!cost) {
      return
    }

    setEditingFixedCostId(cost.id)
    setFixedName(cost.name)
    setFixedAmount(formatCurrencyFromNumber(cost.amount))
    setFixedCategoryId(cost.categoryId)
    setFixedSubcategoryId(cost.subcategoryId)
    setFixedDueDay(cost.dueDay ? String(cost.dueDay) : "")
    setFixedDueOffsetMonths(String(cost.dueOffsetMonths || 0))
    setFixedChargeDay(cost.chargeDay ? String(cost.chargeDay) : "")
    setFixedPaymentMethod(cost.paymentMethod)
    setFixedCardId(cost.cardId || firstCardId)
    setWizardStep(0)
    flashSection("fixed")
    requestAnimationFrame(() => {
      fixedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  function cancelEditingFixed() {
    setEditingFixedCostId("")
    setFixedName("")
    setFixedAmount("")
    setFixedCategoryId(defaultCategories[0].id)
    setFixedSubcategoryId(defaultCategories[0].subcategories[0].id)
    setFixedDueDay("")
    setFixedChargeDay("")
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.delete("editFixedCostId")
      return nextParams
    })
  }

  function addInstallmentTotal(amount: number) {
    setInstallmentTotal((current) => {
      const nextTotal = Math.max((Number(current) || 0) + amount, 1)
      return String(nextTotal)
    })
  }

  function addInstallment(values: InstallmentFormValues) {
    const parsedForm = installmentFormSchema.safeParse(values)
    if (!parsedForm.success) {
      setInstallmentFormError("root", {
        message: parsedForm.error.issues[0]?.message || "Revise o parcelamento."
      })
      return
    }

    const formData = parsedForm.data
    const nextInstallmentPlan = {
      id: editingInstallmentId || crypto.randomUUID(),
      name: formData.name,
      installmentValue: Math.round((formData.value / formData.total) * 100) / 100,
      totalInstallments: formData.total,
      paidInstallments: formData.paid,
      startMonth: formData.startMonth,
      dueOffsetMonths: formData.paymentMethod === "credit" ? undefined : formData.dueOffsetMonths,
      chargeDay: formData.chargeDay,
      paymentMethod: formData.paymentMethod,
      cardId: formData.paymentMethod === "credit" ? formData.cardId : undefined
    }

    if (editingInstallmentId) {
      const target = installmentPlans.find((item) => item.id === editingInstallmentId)
      if (!target) {
        setEditingInstallmentId("")
        return
      }

      const parsedPlan = installmentSchema.safeParse({
        ...target,
        ...nextInstallmentPlan
      })
      if (!parsedPlan.success) {
        setInstallmentFormError("root", {
          message: parsedPlan.error.issues[0]?.message || "Revise o parcelamento."
        })
        return
      }

      updateInstallmentPlan(parsedPlan.data)
      setEditingInstallmentId("")
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams)
        nextParams.delete("editInstallmentId")
        return nextParams
      })
    } else {
      const parsedPlan = installmentSchema.safeParse(nextInstallmentPlan)
      if (!parsedPlan.success) {
        setInstallmentFormError("root", {
          message: parsedPlan.error.issues[0]?.message || "Revise o parcelamento."
        })
        return
      }
      addInstallmentPlan(parsedPlan.data)
    }

    resetInstallmentForm(getDefaultInstallmentFormValues(firstCardId, activeMonthKey))
  }

  function startEditingInstallment(planId: string) {
    const plan = installmentPlans.find((item) => item.id === planId)
    if (!plan) {
      return
    }

    setEditingInstallmentId(plan.id)
    setInstallmentName(plan.name)
    setInstallmentValue(formatCurrencyFromNumber(plan.installmentValue * plan.totalInstallments))
    setInstallmentTotal(String(plan.totalInstallments))
    setInstallmentPaid(String(plan.paidInstallments || 0))
    setInstallmentPaymentMethod(plan.paymentMethod)
    setInstallmentCardId(plan.cardId || firstCardId)
    setInstallmentChargeDay(plan.chargeDay ? String(plan.chargeDay) : "")
    setInstallmentDueOffsetMonths(String(plan.dueOffsetMonths || 0))
    setInstallmentStartMonth(plan.startMonth)
    setWizardStep(1)
    flashSection("installment")
    requestAnimationFrame(() => {
      installmentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  function cancelEditingInstallment() {
    setEditingInstallmentId("")
    setInstallmentName("")
    setInstallmentValue("")
    setInstallmentTotal("")
    setInstallmentPaid("0")
    setInstallmentChargeDay("")
    setInstallmentStartMonth(activeMonthKey)
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.delete("editInstallmentId")
      return nextParams
    })
  }

  function confirmDeleteTarget() {
    if (!deleteTarget) {
      return
    }

    if (deleteTarget.kind === "fixed") {
      removeFixedCost(deleteTarget.id)
      if (editingFixedCostId === deleteTarget.id) {
        cancelEditingFixed()
      }
    } else {
      removeInstallmentPlan(deleteTarget.id)
      if (editingInstallmentId === deleteTarget.id) {
        cancelEditingInstallment()
      }
    }

    setDeleteTarget(null)
  }

  function confirmStopFixedCost() {
    if (!deleteTarget || deleteTarget.kind !== "fixed") {
      return
    }

    stopFixedCost(deleteTarget.id)
    if (editingFixedCostId === deleteTarget.id) {
      cancelEditingFixed()
    }
    setDeleteTarget(null)
  }

  return (
    <section className="flex flex-col gap-4">
      {!embedded && (
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 sm:text-xl">Planejamento</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Faturamento, gastos fixos e parcelamentos que alimentam projeções e limites de cartão.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div
          ref={incomeSectionRef}
          className={`min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition sm:p-5 lg:sticky lg:top-4 ${
            highlightedSection === "income" ? "ring-2 ring-emerald-500 animate-pulse" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Faturamento mensal</h2>
              <p className="mt-0.5 text-sm text-zinc-400">
                <span className="font-semibold tabular-nums text-emerald-300">
                  {formatCurrency(autoTaxRevenueBase)}
                </span>{" "}
                estimado em {getMonthLabel(activeMonthKey)}
              </p>
            </div>
          </div>

          <div
            className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1"
            role="radiogroup"
            aria-label="Regime"
          >
            {(["pj", "clt"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={contractConfig.incomeMode === mode}
                onClick={() => updateContractConfig({ incomeMode: mode })}
                className={`h-9 rounded-lg text-sm font-medium transition ${
                  contractConfig.incomeMode === mode
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {mode === "pj" ? "PJ" : "CLT"}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3">
            {contractConfig.incomeMode === "pj" ? (
              <div className="grid grid-cols-2 gap-2">
                <label className={incomeLabelClassName}>
                  Valor por hora
                  <input
                    className={inputClassName}
                    type="text"
                    inputMode="decimal"
                    value={hourlyRateInput}
                    onChange={(event) => setHourlyRateInput(formatCurrencyInput(event.target.value))}
                    onBlur={() => {
                      const parsed = parseCurrencyInput(hourlyRateInput)
                      setHourlyRateInput(formatCurrencyFromNumber(parsed))
                      updateContractConfig({ hourlyRate: parsed })
                    }}
                  />
                </label>
                <label className={incomeLabelClassName}>
                  Horas por dia
                  <input
                    className={inputClassName}
                    type="number"
                    step="0.5"
                    min="0"
                    value={contractConfig.hoursPerWorkday}
                    onChange={(event) =>
                      updateContractConfig({ hoursPerWorkday: Number(event.target.value || 0) })
                    }
                  />
                </label>
              </div>
            ) : (
              <label className={incomeLabelClassName}>
                Salário líquido
                <input
                  className={inputClassName}
                  type="text"
                  inputMode="decimal"
                  value={cltNetSalaryInput}
                  onChange={(event) => setCltNetSalaryInput(formatCurrencyInput(event.target.value))}
                  onBlur={() => {
                    const parsed = parseCurrencyInput(cltNetSalaryInput)
                    setCltNetSalaryInput(formatCurrencyFromNumber(parsed))
                    updateContractConfig({ cltNetSalary: parsed })
                  }}
                />
              </label>
            )}

            {contractConfig.incomeMode === "pj" && (
              <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 text-sm text-zinc-300">
                <span>
                  Descontar feriados
                  <span className="block text-xs text-zinc-500">Feriados nacionais via BrasilAPI</span>
                </span>
                <span className="relative inline-flex shrink-0">
                  <input
                    className="peer sr-only"
                    type="checkbox"
                    checked={contractConfig.useHolidayApi}
                    onChange={(event) => updateContractConfig({ useHolidayApi: event.target.checked })}
                  />
                  <span className="h-6 w-11 rounded-full bg-zinc-700 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/40" />
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5 motion-reduce:transition-none" />
                </span>
              </label>
            )}
          </div>

          <div className="mt-4 border-t border-zinc-800 pt-4">
            <h3 className="text-sm font-medium text-zinc-200">Recebimento</h3>
            <div className="mt-2 grid gap-3">
              <label className={incomeLabelClassName}>
                Data do recebimento
                <input
                  className={inputClassName}
                  type="date"
                  value={contractConfig.incomeMode === "pj" ? contractConfig.pjPaydayDate : contractConfig.cltPaydayDate}
                  onChange={(event) =>
                    updateContractConfig(
                      contractConfig.incomeMode === "pj"
                        ? { pjPaydayDate: event.target.value }
                        : { cltPaydayDate: event.target.value }
                    )
                  }
                />
              </label>
              <label className={incomeLabelClassName}>
                Competência
                <SelectField
                  value={String(
                    (contractConfig.incomeMode === "pj"
                      ? contractConfig.pjCompetenceOffsetMonths
                      : contractConfig.cltCompetenceOffsetMonths) || 0
                  )}
                  onChange={(event) =>
                    updateContractConfig(
                      contractConfig.incomeMode === "pj"
                        ? { pjCompetenceOffsetMonths: Number(event.target.value || 0) }
                        : { cltCompetenceOffsetMonths: Number(event.target.value || 0) }
                    )
                  }
                >
                  {competenceOffsetOptions.map((option) => (
                    <option key={`competence-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </label>
              <label className={incomeLabelClassName}>
                Começa a contar a partir de
                <input
                  className={inputClassName}
                  type="month"
                  value={contractConfig.incomeStartMonth || ""}
                  onChange={(event) =>
                    updateContractConfig({ incomeStartMonth: event.target.value || undefined })
                  }
                />
              </label>
            </div>
          </div>

          {contractConfig.incomeMode === "pj" && (
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <label className={incomeLabelClassName}>
                Imposto sobre faturamento (DAS)
                <div className="relative">
                  <input
                    className={`${inputClassName} pr-9`}
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex.: 9,21"
                    value={autoTaxPercentageInput}
                    onChange={(event) => setAutoTaxPercentageInput(event.target.value)}
                    onBlur={() => commitAutoTaxPercentage(autoTaxPercentageInput)}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    %
                  </span>
                </div>
              </label>
              <p className="mt-1.5 text-xs text-zinc-500">
                {autoTaxPreviewAmount > 0
                  ? `≈ ${formatCurrency(autoTaxPreviewAmount)} neste mês, lançado como gasto fixo automático.`
                  : "Deixe em branco para não descontar imposto."}
              </p>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1" role="tablist">
            {[
              { id: 0 as const, label: "Gastos fixos", count: fixedCosts.length },
              { id: 1 as const, label: "Parcelamentos", count: installmentPlans.length }
            ].map((step) => (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={wizardStep === step.id}
                className={`h-10 rounded-lg text-sm font-medium transition ${
                  wizardStep === step.id
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                onClick={() => setWizardStep(step.id)}
              >
                {step.label}
                <span className="ml-1.5 text-xs tabular-nums text-zinc-500">{step.count}</span>
              </button>
            ))}
          </div>

          {wizardStep === 0 && (
            <div
              ref={fixedSectionRef}
              className={`min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition sm:p-5 ${
                highlightedSection === "fixed" ? "ring-2 ring-emerald-500 animate-pulse" : ""
              }`}
            >
              <h2 className="mb-3 text-base font-semibold text-zinc-100">{editingFixedCostId ? "Editar gasto fixo" : "Novo gasto fixo"}</h2>
              <form className="grid gap-2" onSubmit={handleSubmitFixed(addFixed)}>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <InputField
                    className={inputClassName}
                    icon={Tag}
                    placeholder="Nome"
                    value={fixedName}
                    onChange={(event) => setFixedName(event.target.value)}
                  />
                  <InputField
                    className={inputClassName}
                    icon={BadgeDollarSign}
                    type="text"
                    inputMode="decimal"
                    placeholder="Valor"
                    value={fixedAmount}
                    onChange={(event) => setFixedAmount(formatCurrencyInput(event.target.value))}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <SelectField
                    icon={FolderTree}
                    value={fixedCategoryId}
                    onChange={(event) => {
                      const nextCategory =
                        defaultCategories.find((category) => category.id === event.target.value) ||
                        defaultCategories[0]
                      setFixedCategoryId(nextCategory.id)
                      setFixedSubcategoryId(nextCategory.subcategories[0].id)
                    }}
                  >
                    {defaultCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    icon={FolderTree}
                    value={fixedSubcategoryId}
                    onChange={(event) => setFixedSubcategoryId(event.target.value)}
                  >
                    {selectedFixedCategory.subcategories.map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <SelectField
                    icon={Wallet}
                    value={fixedPaymentMethod}
                    onChange={(event) => setFixedPaymentMethod(event.target.value as PaymentMethod)}
                  >
                    {paymentMethodOptions.map((option) => (
                      <option key={`fixed-payment-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                  {fixedPaymentMethod !== "credit" && (
                    <SelectField
                      icon={CalendarClock}
                      value={fixedDueOffsetMonths}
                      onChange={(event) => setFixedDueOffsetMonths(event.target.value)}
                    >
                      <option value="0">Vence no mesmo mês</option>
                      <option value="1">Vence no mês seguinte</option>
                    </SelectField>
                  )}
                  {fixedPaymentMethod === "credit" && (
                    <>
                      <SelectField
                        icon={CreditCard}
                        value={fixedCardId}
                        onChange={(event) => setFixedCardId(event.target.value)}
                      >
                        <option value="">Selecionar cartão</option>
                        <option value="other">Outros</option>
                        {cards.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name}
                          </option>
                        ))}
                      </SelectField>
                      <SelectField
                        icon={CalendarDays}
                        value={fixedChargeDay}
                        onChange={(event) => setFixedChargeDay(event.target.value)}
                      >
                        <option value="">Cobrança imediata</option>
                        {Array.from({ length: 31 }).map((_, index) => {
                          const day = String(index + 1)
                          return (
                            <option key={`fixed-charge-day-${day}`} value={day}>
                              Cobra dia {day}
                            </option>
                          )
                        })}
                      </SelectField>
                    </>
                  )}
                  {fixedPaymentMethod !== "credit" && (
                    <SelectField
                      icon={CalendarDays}
                      value={fixedDueDay}
                      onChange={(event) => setFixedDueDay(event.target.value)}
                    >
                      <option value="">Sem dia de vencimento</option>
                      {Array.from({ length: 31 }).map((_, index) => {
                        const day = String(index + 1)
                        return (
                          <option key={`fixed-due-day-${day}`} value={day}>
                            Vence dia {day}
                          </option>
                        )
                      })}
                    </SelectField>
                  )}
                </div>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  {fixedFormErrors.root?.message && (
                    <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 sm:mr-auto">
                      {fixedFormErrors.root.message}
                    </p>
                  )}
                 
                  {editingFixedCostId && (
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                      onClick={cancelEditingFixed}
                      type="button"
                    >
                      <X size={16} />
                      Cancelar edição
                    </button>
                  )}
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400 sm:min-w-[140px]"
                    type="submit"
                  >
                    {editingFixedCostId ? <Save size={16} /> : <Plus size={16} />}
                    {editingFixedCostId ? "Salvar edição" : "Adicionar"}
                  </button>
                </div>
              </form>
            </div>
          )}


          {wizardStep === 0 && (
            <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">Gastos cadastrados</h2>
                  {visibleFixedCosts.length > 0 && (
                    <p className="text-sm text-zinc-400">
                      <span className="font-semibold tabular-nums text-zinc-100">
                        {formatCurrency(activeFixedCostsTotal)}
                      </span>{" "}
                      por mês nos ativos
                    </p>
                  )}
                </div>
                {endedFixedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowEndedFixed((current) => !current)}
                  aria-pressed={showEndedFixed}
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                >
                  {showEndedFixed ? <SquareCheck size={16} className="text-emerald-400" /> : <Square size={16} />}
                  Encerrados ({endedFixedCount})
                </button>
                )}
              </div>
              {listedFixedCosts.length === 0 ? (
                <p className="py-6 text-sm text-zinc-500">
                  {visibleFixedCosts.length === 0
                    ? "Nenhum gasto fixo cadastrado. Use o formulário acima para adicionar o primeiro."
                    : "Todos os gastos fixos estão encerrados."}
                </p>
              ) : (
                <ul
                  className={`mt-2 divide-y divide-zinc-800 ${
                    isFixedListExpanded && listedFixedCosts.length > 10
                      ? "max-h-[660px] overflow-y-auto overscroll-contain pr-1"
                      : ""
                  }`}
                >
                  {(isFixedListExpanded
                    ? listedFixedCosts
                    : listedFixedCosts.slice(0, COLLAPSED_LIST_ITEMS)
                  ).map((cost) => (
                    <li
                      key={cost.id}
                      className={`flex items-center gap-3 py-3 ${
                        editingFixedCostId === cost.id ? "bg-emerald-500/10" : ""
                      } ${cost.endMonth ? "opacity-60" : ""}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">{cost.name}</p>
                        <p className="text-sm font-semibold tabular-nums text-zinc-100 sm:hidden">
                          {formatCurrency(cost.amount)}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {getCategoryLabel(cost.categoryId, cost.subcategoryId)} ·{" "}
                          {getPaymentLabel(cost.paymentMethod, cost.cardId)}
                          {cost.paymentMethod !== "credit" && cost.dueDay
                            ? ` · vence dia ${cost.dueDay}${cost.dueOffsetMonths === 1 ? " do mês seguinte" : ""}`
                            : ""}
                          {cost.paymentMethod === "credit" && cost.chargeDay ? ` · cobra dia ${cost.chargeDay}` : ""}
                          {cost.endMonth ? ` · encerrado em ${getMonthLabel(cost.endMonth)}` : ""}
                        </p>
                      </div>
                      <span className="hidden shrink-0 text-sm font-semibold tabular-nums text-zinc-100 sm:block">
                        {formatCurrency(cost.amount)}
                      </span>
                      <div className="flex shrink-0 items-center">
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-emerald-300"
                          onClick={() => startEditingFixed(cost.id)}
                          type="button"
                          aria-label={`Editar ${cost.name}`}
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-rose-300"
                          onClick={() => setDeleteTarget({ kind: "fixed", id: cost.id, label: cost.name })}
                          type="button"
                          aria-label={`Remover ${cost.name}`}
                          title="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {listedFixedCosts.length > COLLAPSED_LIST_ITEMS && (
                <button
                  type="button"
                  onClick={() => setIsFixedListExpanded((current) => !current)}
                  aria-expanded={isFixedListExpanded}
                  className="mt-1 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm text-zinc-400 transition hover:bg-zinc-800/60 hover:text-zinc-200"
                >
                  {isFixedListExpanded ? "Mostrar menos" : `Mostrar mais ${listedFixedCosts.length - COLLAPSED_LIST_ITEMS}`}
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 motion-reduce:transition-none ${isFixedListExpanded ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </div>
          )}
          {wizardStep === 1 && (
            <div
              ref={installmentSectionRef}
              className={`min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition sm:p-5 ${
                highlightedSection === "installment"
                  ? "ring-2 ring-emerald-500 animate-pulse"
                  : ""
              }`}
            >
              <h2 className="mb-3 text-base font-semibold text-zinc-100">{editingInstallmentId ? "Editar parcelamento" : "Novo parcelamento"}</h2>
              <form className="grid gap-4" onSubmit={handleSubmitInstallment(addInstallment)}>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <label className="grid gap-1 text-xs font-medium text-zinc-400">
                    Nome
                    <InputField
                      className={inputClassName}
                      icon={Tag}
                      placeholder="Notebook"
                      value={installmentName}
                      onChange={(event) => setInstallmentName(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-zinc-400">
                    Valor total
                    <InputField
                      className={inputClassName}
                      icon={BadgeDollarSign}
                      type="text"
                      inputMode="decimal"
                      placeholder="R$ 0,00"
                      value={installmentValue}
                      onChange={(event) =>
                        setInstallmentValue(formatCurrencyInput(event.target.value))
                      }
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(280px,1fr)] xl:items-start">
                  <label className="grid gap-1 text-xs font-medium text-zinc-400">
                    Total de parcelas
                    <InputField
                      className={numberInputClassName}
                      icon={Hash}
                      type="number"
                      min="1"
                      placeholder="0"
                      value={installmentTotal}
                      onChange={(event) => setInstallmentTotal(event.target.value)}
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      {installmentTotalChips.map((amount) => (
                        <button
                          key={`installment-chip-${amount}`}
                          className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-xs font-medium text-zinc-300 transition hover:border-emerald-500 hover:text-emerald-300"
                          onClick={() => addInstallmentTotal(amount)}
                          type="button"
                        >
                          +{amount}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-zinc-400">
                    Parcelas pagas
                    <InputField
                      className={numberInputClassName}
                      icon={Hash}
                      type="number"
                      min="0"
                      placeholder="0"
                      value={installmentPaid}
                      onChange={(event) => setInstallmentPaid(event.target.value)}
                    />
                  </label>
                  <label className="grid min-w-0 gap-1 text-xs font-medium text-zinc-400">
                    Forma de pagamento
                    <SelectField
                      icon={Wallet}
                      value={installmentPaymentMethod}
                      onChange={(event) =>
                        setInstallmentPaymentMethod(event.target.value as PaymentMethod)
                      }
                    >
                      {paymentMethodOptions.map((option) => (
                        <option key={`installment-payment-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {installmentPaymentMethod !== "credit" && (
                    <label className="grid gap-1 text-xs font-medium text-zinc-400">
                      Quando vence
                      <SelectField
                        icon={CalendarClock}
                        value={installmentDueOffsetMonths}
                        onChange={(event) => setInstallmentDueOffsetMonths(event.target.value)}
                      >
                        <option value="0">No mesmo mês</option>
                        <option value="1">No mês seguinte</option>
                      </SelectField>
                    </label>
                  )}
                  {installmentPaymentMethod === "credit" && (
                    <label className="grid gap-1 text-xs font-medium text-zinc-400">
                      Cartão
                      <SelectField
                        icon={CreditCard}
                        value={installmentCardId}
                        onChange={(event) => setInstallmentCardId(event.target.value)}
                      >
                        <option value="">Selecionar cartão</option>
                        <option value="other">Outros</option>
                        {cards.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name}
                          </option>
                        ))}
                      </SelectField>
                    </label>
                  )}
                  <label className="grid gap-1 text-xs font-medium text-zinc-400">
                    {installmentPaymentMethod === "credit"
                      ? "Dia da cobrança"
                      : "Dia do vencimento"}
                    <SelectField
                      icon={CalendarDays}
                      value={installmentChargeDay}
                      onChange={(event) => setInstallmentChargeDay(event.target.value)}
                    >
                      <option value="">
                        {installmentPaymentMethod === "credit"
                          ? "Cobrança imediata"
                          : "Sem dia de vencimento"}
                      </option>
                      {Array.from({ length: 31 }).map((_, index) => {
                        const day = String(index + 1)
                        return (
                          <option key={`installment-charge-day-${day}`} value={day}>
                            {installmentPaymentMethod === "credit"
                              ? `Cobra dia ${day}`
                              : `Vence dia ${day}`}
                          </option>
                        )
                      })}
                    </SelectField>
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <label className="grid gap-1 text-xs font-medium text-zinc-400">
                    Primeiro mês da parcela
                    <SelectField
                      icon={CalendarDays}
                      value={installmentStartMonth.split("-")[1]}
                      onChange={(event) => {
                        const [year] = installmentStartMonth.split("-")
                        setInstallmentStartMonth(`${year}-${event.target.value}`)
                      }}
                    >
                      {Array.from({ length: 12 }).map((_, index) => {
                        const month = String(index + 1).padStart(2, "0")
                        return (
                          <option key={`month-${month}`} value={month}>
                            {month}
                          </option>
                        )
                      })}
                    </SelectField>
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-zinc-400">
                    Ano da primeira parcela
                    <SelectField
                      icon={CalendarDays}
                      value={installmentStartMonth.split("-")[0]}
                      onChange={(event) => {
                        const month = installmentStartMonth.split("-")[1]
                        setInstallmentStartMonth(`${event.target.value}-${month}`)
                      }}
                    >
                      {Array.from({ length: 7 }).map((_, index) => {
                        const year = String(new Date().getFullYear() - 3 + index)
                        return (
                          <option key={`year-${year}`} value={year}>
                            {year}
                          </option>
                        )
                      })}
                    </SelectField>
                  </label>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
                  {installmentValuePreview > 0 && (
                    <span className="mr-1 font-semibold text-zinc-200">
                      {Math.max(Number(installmentTotal || 1), 1)}x de {formatCurrency(installmentValuePreview)}.
                    </span>
                  )}
                  {installmentProgressPreview.isActive
                    ? `No mês ativo, este parcelamento está em ${installmentProgressPreview.currentInstallment}/${Math.max(
                        Number(installmentTotal || 1),
                        1
                      )}.`
                    : "No mês ativo, este parcelamento ainda não começou ou já foi encerrado."}{" "}
                  {Number(installmentPaid || 0) > 0
                    ? `Quitadas manualmente: ${Number(installmentPaid || 0)}.`
                    : "Quitadas manualmente: 0."}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  {installmentFormErrors.root?.message && (
                    <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 sm:mr-auto">
                      {installmentFormErrors.root.message}
                    </p>
                  )}
                  {editingInstallmentId && (
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                      onClick={cancelEditingInstallment}
                      type="button"
                    >
                      <X size={16} />
                      Cancelar edição
                    </button>
                  )}
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400 sm:min-w-[140px]"
                    type="submit"
                  >
                    {editingInstallmentId ? <Save size={16} /> : <Plus size={16} />}
                    {editingInstallmentId ? "Salvar edição" : "Adicionar"}
                  </button>
                 
                </div>
              </form>
            </div>
          )}
          {wizardStep === 1 && (
            <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <h2 className="text-base font-semibold text-zinc-100">Parcelamentos cadastrados</h2>
                {endedInstallmentCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowEndedInstallments((current) => !current)}
                  aria-pressed={showEndedInstallments}
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                >
                  {showEndedInstallments ? <SquareCheck size={16} className="text-emerald-400" /> : <Square size={16} />}
                  Encerrados ({endedInstallmentCount})
                </button>
                )}
              </div>
              {listedInstallments.length === 0 ? (
                <p className="py-6 text-sm text-zinc-500">
                  {installmentPlans.length === 0
                    ? "Nenhum parcelamento cadastrado. Use o formulário acima para adicionar o primeiro."
                    : "Todos os parcelamentos estão encerrados."}
                </p>
              ) : (
                <ul
                  className={`mt-2 divide-y divide-zinc-800 ${
                    isInstallmentListExpanded && listedInstallments.length > 10
                      ? "max-h-[720px] overflow-y-auto overscroll-contain pr-1"
                      : ""
                  }`}
                >
                  {(isInstallmentListExpanded
                    ? listedInstallments
                    : listedInstallments.slice(0, COLLAPSED_LIST_ITEMS)
                  ).map((plan) => {
                    const progress = getInstallmentProgress(plan, activeMonthKey)
                    const isEnded = isInstallmentEnded(plan)
                    const progressRatio = progress.isActive
                      ? Math.min(progress.currentInstallment / Math.max(plan.totalInstallments, 1), 1)
                      : isEnded
                        ? 1
                        : 0
                    return (
                      <li
                        key={plan.id}
                        className={`flex items-center gap-3 py-3 ${
                          editingInstallmentId === plan.id ? "bg-emerald-500/10" : ""
                        } ${isEnded ? "opacity-60" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <p className="truncate text-sm font-medium text-zinc-100">{plan.name}</p>
                            <span className="shrink-0 text-xs tabular-nums text-zinc-400">
                              {progress.isActive
                                ? `${progress.currentInstallment}/${plan.totalInstallments}`
                                : isEnded
                                  ? "encerrado"
                                  : `começa em ${getMonthLabel(plan.startMonth)}`}
                            </span>
                          </div>
                          <p className="text-sm font-semibold tabular-nums text-zinc-100 sm:hidden">
                            {formatCurrency(plan.installmentValue * plan.totalInstallments)}
                            <span className="ml-1 text-xs font-normal text-zinc-500">
                              {plan.totalInstallments}x {formatCurrency(plan.installmentValue)}
                            </span>
                          </p>
                          <div className="mt-1.5 h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-emerald-400"
                              style={{ width: `${progressRatio * 100}%` }}
                            />
                          </div>
                          <p className="mt-1 truncate text-xs text-zinc-500">
                            {getPaymentLabel(plan.paymentMethod, plan.cardId)}
                            {plan.chargeDay
                              ? plan.paymentMethod === "credit"
                                ? ` · cobra dia ${plan.chargeDay}`
                                : ` · vence dia ${plan.chargeDay}${plan.dueOffsetMonths === 1 ? " do mês seguinte" : ""}`
                              : ""}
                            {(plan.paidInstallments || 0) > 0 ? ` · ${plan.paidInstallments} pagas` : ""}
                          </p>
                        </div>
                        <div className="hidden shrink-0 text-right sm:block">
                          <p className="text-sm font-semibold tabular-nums text-zinc-100">
                            {formatCurrency(plan.installmentValue * plan.totalInstallments)}
                          </p>
                          <p className="text-xs tabular-nums text-zinc-500">
                            {plan.totalInstallments}x {formatCurrency(plan.installmentValue)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center">
                          <button
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-emerald-300"
                            onClick={() => startEditingInstallment(plan.id)}
                            type="button"
                            aria-label={`Editar ${plan.name}`}
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-rose-300"
                            onClick={() =>
                              setDeleteTarget({ kind: "installment", id: plan.id, label: plan.name })
                            }
                            type="button"
                            aria-label={`Excluir ${plan.name}`}
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              {listedInstallments.length > COLLAPSED_LIST_ITEMS && (
                <button
                  type="button"
                  onClick={() => setIsInstallmentListExpanded((current) => !current)}
                  aria-expanded={isInstallmentListExpanded}
                  className="mt-1 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm text-zinc-400 transition hover:bg-zinc-800/60 hover:text-zinc-200"
                >
                  {isInstallmentListExpanded ? "Mostrar menos" : `Mostrar mais ${listedInstallments.length - COLLAPSED_LIST_ITEMS}`}
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 motion-reduce:transition-none ${isInstallmentListExpanded ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/85 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 text-base font-semibold text-zinc-100">
              {deleteTarget.kind === "fixed" ? "Remover gasto fixo" : "Confirmar exclusão"}
            </div>
            {deleteTarget.kind === "fixed" ? (
              <p className="text-sm leading-6 text-zinc-400">
                O que fazer com{" "}
                <span className="font-medium text-zinc-200">{deleteTarget.label}</span>?
                Parar a cobrança mantém o histórico dos meses anteriores intacto; excluir
                remove o gasto de tudo, inclusive do histórico.
              </p>
            ) : (
              <p className="text-sm leading-6 text-zinc-400">
                Remover <span className="font-medium text-zinc-200">{deleteTarget.label}</span> da
                lista de parcelamentos?
              </p>
            )}
            <div className={`mt-5 grid gap-2 ${deleteTarget.kind === "fixed" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                <X size={16} />
                Cancelar
              </button>
              {deleteTarget.kind === "fixed" && (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-emerald-400"
                  onClick={confirmStopFixedCost}
                  type="button"
                >
                  Parar cobrança
                </button>
              )}
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-rose-400"
                onClick={confirmDeleteTarget}
                type="button"
              >
                <Trash2 size={16} />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
