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
  List,
  LucideIcon,
  Pencil,
  Plus,
  Save,
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
  "w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
const inputClassName =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
const numberInputClassName =
  `${inputClassName} w-24 shrink-0 appearance-none text-left [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`
const installmentTotalChips = [1, 2, 3, 6, 12]
const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Conta" },
  { value: "debit", label: "Débito" },
  { value: "pix", label: "Pix" },
  { value: "bank-transfer", label: "Transferência" },
  { value: "bank-slip", label: "Boleto" },
  { value: "cash-money", label: "Dinheiro" },
  { value: "credit", label: "Cartão de crédito" }
]
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
  const [listModal, setListModal] = useState<"fixed" | "installment" | null>(null)
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
  const installmentProgressPreview = useMemo(
    () =>
      getInstallmentProgress(
        {
          id: editingInstallmentId || "preview-installment",
          name: installmentName || "Parcelamento",
          installmentValue: parseCurrencyInput(installmentValue) || 0,
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
      installmentValue,
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
      fixedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
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
    setInstallmentValue(formatCurrencyFromNumber(plan.installmentValue))
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
      installmentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }, [searchParams, wizardStep])

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
      fixedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
    setListModal(null)
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
      installmentValue: formData.value,
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
    setInstallmentValue(formatCurrencyFromNumber(plan.installmentValue))
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
      installmentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
    setListModal(null)
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
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      {!embedded && <h1 className="text-xl font-semibold text-zinc-100">Planejamento</h1>}
      <p className="text-sm text-zinc-400">
        Cadastre faturamento, gastos fixos e parcelamentos para alimentar projeções e limite de cartão.
      </p>

      <div className="grid gap-4 md:grid-cols-[340px_1fr]">
        <div
          ref={incomeSectionRef}
          className={`rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition ${
            highlightedSection === "income" ? "ring-2 ring-emerald-500 animate-pulse" : ""
          }`}
        >
          <h2 className="mb-3 text-sm font-semibold text-zinc-100">Faturamento mensal</h2>
          <div className="mb-3 grid gap-2">
            <label className="text-xs uppercase tracking-wide text-zinc-400">Regime</label>
            <SelectField
              value={contractConfig.incomeMode}
              onChange={(event) =>
                updateContractConfig({ incomeMode: event.target.value as "pj" | "clt" })
              }
            >
              <option value="pj">PJ</option>
              <option value="clt">CLT</option>
            </SelectField>
          </div>

          <div className="grid gap-3">
            {contractConfig.incomeMode === "pj" ? (
              <>
                <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-400">
                  Valor/Hora PJ
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
                <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-400">
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
                <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-400">
                  Data do recebimento PJ
                  <input
                    className={inputClassName}
                    type="date"
                    value={contractConfig.pjPaydayDate}
                    onChange={(event) =>
                      updateContractConfig({ pjPaydayDate: event.target.value })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-400">
                  Primeiro mês de competência
                  <input
                    className={inputClassName}
                    type="month"
                    value={contractConfig.incomeStartMonth || ""}
                    onChange={(event) =>
                      updateContractConfig({ incomeStartMonth: event.target.value || undefined })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-400">
                  Mês de competência PJ
                  <SelectField
                    value={String(contractConfig.pjCompetenceOffsetMonths || 0)}
                    onChange={(event) =>
                      updateContractConfig({
                        pjCompetenceOffsetMonths: Number(event.target.value || 0)
                      })
                    }
                  >
                    {competenceOffsetOptions.map((option) => (
                      <option key={`pj-competence-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </label>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-400">
                  Salário líquido CLT
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
                <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-400">
                  Data do recebimento
                  <input
                    className={inputClassName}
                    type="date"
                    value={contractConfig.cltPaydayDate}
                    onChange={(event) =>
                      updateContractConfig({ cltPaydayDate: event.target.value })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-400">
                  Primeiro mês de competência
                  <input
                    className={inputClassName}
                    type="month"
                    value={contractConfig.incomeStartMonth || ""}
                    onChange={(event) =>
                      updateContractConfig({ incomeStartMonth: event.target.value || undefined })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-400">
                  Mês de competência CLT
                  <SelectField
                    value={String(contractConfig.cltCompetenceOffsetMonths || 0)}
                    onChange={(event) =>
                      updateContractConfig({
                        cltCompetenceOffsetMonths: Number(event.target.value || 0)
                      })
                    }
                  >
                    {competenceOffsetOptions.map((option) => (
                      <option key={`clt-competence-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </label>
              </>
            )}

          </div>

          {contractConfig.incomeMode === "pj" && (
            <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
              <input
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
                type="checkbox"
                checked={contractConfig.useHolidayApi}
                onChange={(event) => updateContractConfig({ useHolidayApi: event.target.checked })}
              />
              Usar API de feriados nacionais (BrasilAPI)
            </label>
          )}

          {contractConfig.incomeMode === "pj" && (
            <div className="mt-4 border-t border-zinc-800 pt-3">
              <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-400">
                Imposto automático sobre faturamento (ex.: DAS)
                <input
                  className={inputClassName}
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex.: 9,21 (%)"
                  value={autoTaxPercentageInput}
                  onChange={(event) => setAutoTaxPercentageInput(event.target.value)}
                  onBlur={() => commitAutoTaxPercentage(autoTaxPercentageInput)}
                />
              </label>
              <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                {autoTaxPreviewAmount > 0
                  ? `Calculado automaticamente todo mês a partir do faturamento (≈ ${formatCurrency(autoTaxPreviewAmount)} neste mês).`
                  : "Deixe em branco para não cobrar imposto automático."}
              </p>
            </div>
          )}

          <p className="mt-3 text-xs leading-5 text-zinc-500">
            O mês inicial de competência define quando a recorrência começa. A data de
            recebimento define quando o dinheiro entra.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid gap-2 md:grid-cols-2">
            {[
              { id: 0 as const, label: "1. Gastos fixos" },
              { id: 1 as const, label: "2. Parcelamentos" }
            ].map((step) => (
              <button
                key={step.id}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  wizardStep === step.id
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
                }`}
                onClick={() => setWizardStep(step.id)}
              >
                {step.label}
              </button>
            ))}
          </div>

          {wizardStep === 0 && (
            <div
              ref={fixedSectionRef}
              className={`rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition ${
                highlightedSection === "fixed" ? "ring-2 ring-emerald-500 animate-pulse" : ""
              }`}
            >
              <h2 className="mb-3 text-sm font-semibold text-zinc-100">Gastos fixos</h2>
              <form className="grid gap-2" onSubmit={handleSubmitFixed(addFixed)}>
                <div className="grid gap-2 md:grid-cols-2">
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
                <div className="grid gap-2 md:grid-cols-2">
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
                  <div className="grid gap-2 md:grid-cols-2">
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
                  </div>
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
                <div
                  className={`grid gap-2 ${editingFixedCostId ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
                >
                  {fixedFormErrors.root?.message && (
                    <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 sm:col-span-full">
                      {fixedFormErrors.root.message}
                    </p>
                  )}
                 
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                    onClick={() => setListModal("fixed")}
                    type="button"
                  >
                    <List size={16} />
                    Ver gastos ({fixedCosts.length})
                  </button>
                   <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400"
                    type="submit"
                  >
                    {editingFixedCostId ? <Save size={16} /> : <Plus size={16} />}
                    {editingFixedCostId ? "Salvar edição" : "Adicionar"}
                  </button>
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
                </div>
              </form>
            </div>
          )}

          {wizardStep === 1 && (
            <div
              ref={installmentSectionRef}
              className={`rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition ${
                highlightedSection === "installment"
                  ? "ring-2 ring-emerald-500 animate-pulse"
                  : ""
              }`}
            >
              <h2 className="mb-3 text-sm font-semibold text-zinc-100">Parcelamentos</h2>
              <form className="grid gap-4" onSubmit={handleSubmitInstallment(addInstallment)}>
                <div className="grid gap-3 xl:grid-cols-2">
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
                    Valor da parcela
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
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(280px,1fr)] xl:items-start">
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
                <div className="grid gap-3 xl:grid-cols-2">
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
                <div className="grid gap-3 xl:grid-cols-2">
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
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400">
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
                <div
                  className={`grid gap-2 ${editingInstallmentId ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
                >
                  {installmentFormErrors.root?.message && (
                    <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 sm:col-span-full">
                      {installmentFormErrors.root.message}
                    </p>
                  )}
                   <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                    onClick={() => setListModal("installment")}
                    type="button"
                  >
                    <List size={16} />
                    Ver parcelas ({installmentPlans.length})
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400"
                    type="submit"
                  >
                    {editingInstallmentId ? <Save size={16} /> : <Plus size={16} />}
                    {editingInstallmentId ? "Salvar edição" : "Adicionar"}
                  </button>
                 
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
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {listModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4"
          onClick={() => setListModal(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-100">
                {listModal === "fixed" ? "Lista de gastos fixos" : "Lista de parcelamentos"}
              </h3>
              <button
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                onClick={() => setListModal(null)}
                type="button"
              >
                Fechar
              </button>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {listModal === "fixed" &&
                fixedCosts
                  .filter((cost) => cost.amountMode !== "percentageOfRevenue")
                  .map((cost) => (
                  <div
                    key={cost.id}
                    className={`rounded-xl border px-4 py-4 text-sm text-zinc-300 ${
                      editingFixedCostId === cost.id
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : cost.endMonth
                          ? "border-zinc-800/60 bg-zinc-950/40 opacity-60"
                          : "border-zinc-800 bg-zinc-950/70"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-base font-medium text-zinc-100">{cost.name}</span>
                          <span className="text-sm font-semibold text-zinc-200">
                            {formatCurrency(cost.amount)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-400">
                            {(() => {
                              const category = defaultCategories.find(
                                (item) => item.id === cost.categoryId
                              )
                              if (!category) {
                                return "Categoria não definida"
                              }
                              const subcategory = category.subcategories.find(
                                (item) => item.id === cost.subcategoryId
                              )
                              return subcategory
                                ? `${category.name} / ${subcategory.name}`
                                : category.name
                            })()}
                          </span>
                          <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-400">
                            {getPaymentLabel(cost.paymentMethod, cost.cardId)}
                          </span>
                          {cost.paymentMethod !== "credit" && cost.dueDay && (
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-300">
                              Vence dia {cost.dueDay}
                              {cost.dueOffsetMonths === 1 ? " · mês seguinte" : ""}
                            </span>
                          )}
                          {cost.paymentMethod === "credit" && cost.chargeDay && (
                            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-300">
                              Cobra dia {cost.chargeDay}
                            </span>
                          )}
                          {cost.endMonth && (
                            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-rose-300">
                              Encerrado em {getMonthLabel(cost.endMonth)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 self-start">
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-500 hover:text-emerald-300"
                          onClick={() => startEditingFixed(cost.id)}
                          type="button"
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                        <button
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-rose-500 hover:text-rose-300"
                          onClick={() =>
                            setDeleteTarget({ kind: "fixed", id: cost.id, label: cost.name })
                          }
                          type="button"
                        >
                          <Trash2 size={14} />
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              {listModal === "installment" &&
                installmentPlans.map((plan) => {
                  const progress = getInstallmentProgress(plan, activeMonthKey)
                  return (
                    <div
                      key={plan.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-4 text-sm text-zinc-300"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="text-base font-medium text-zinc-100">{plan.name}</span>
                            <span className="text-sm font-semibold text-zinc-200">
                              {formatCurrency(plan.installmentValue)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-400">
                              {progress.isActive
                                ? `${progress.currentInstallment}/${plan.totalInstallments}`
                                : "encerrado"}
                            </span>
                            {(plan.paidInstallments || 0) > 0 && (
                              <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-400">
                                {plan.paidInstallments} pagas
                              </span>
                            )}
                            <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-400">
                              {getPaymentLabel(plan.paymentMethod, plan.cardId)}
                            </span>
                            {plan.chargeDay && (
                              <span
                                className={`rounded-full px-2.5 py-1 ${
                                  plan.paymentMethod === "credit"
                                    ? "border border-sky-500/30 bg-sky-500/10 text-sky-300"
                                    : "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                                }`}
                              >
                                {plan.paymentMethod === "credit"
                                  ? `Cobra dia ${plan.chargeDay}`
                                  : `Vence dia ${plan.chargeDay}${plan.dueOffsetMonths === 1 ? " · mês seguinte" : ""}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 self-start">
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-500 hover:text-emerald-300"
                            onClick={() => startEditingInstallment(plan.id)}
                            type="button"
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-rose-500 hover:text-rose-300"
                            onClick={() =>
                              setDeleteTarget({
                                kind: "installment",
                                id: plan.id,
                                label: plan.name
                              })
                            }
                            type="button"
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

              {listModal === "fixed" && fixedCosts.length === 0 && (
                <p className="rounded-xl border border-zinc-800 px-4 py-4 text-sm text-zinc-400">
                  Nenhum gasto fixo cadastrado.
                </p>
              )}

              {listModal === "installment" && installmentPlans.length === 0 && (
                <p className="rounded-xl border border-zinc-800 px-4 py-4 text-sm text-zinc-400">
                  Nenhum parcelamento cadastrado.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
