import { SelectHTMLAttributes, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { defaultCategories } from "../data/categories"
import { useTransactionStore } from "../store/useTransactionStore"
import { formatCurrency } from "../components/Transactions"
import { getCurrentMonthKey, getInstallmentProgress } from "../utils/projections"
import {
  formatCurrencyFromNumber,
  formatCurrencyInput,
  parseCurrencyInput
} from "../utils/currency-input"

const selectClassName =
  "w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
const inputClassName =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"

type PlanningPageProps = {
  embedded?: boolean
}

function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${selectClassName} ${props.className || ""}`.trim()} />
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
      />
    </div>
  )
}

export const PlanningPage = ({ embedded = false }: PlanningPageProps) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const cards = useTransactionStore((state) => state.cards)
  const fixedCosts = useTransactionStore((state) => state.fixedCosts)
  const installmentPlans = useTransactionStore((state) => state.installmentPlans)
  const contractConfig = useTransactionStore((state) => state.contractConfig)
  const addFixedCost = useTransactionStore((state) => state.addFixedCost)
  const updateFixedCost = useTransactionStore((state) => state.updateFixedCost)
  const removeFixedCost = useTransactionStore((state) => state.removeFixedCost)
  const addInstallmentPlan = useTransactionStore((state) => state.addInstallmentPlan)
  const updateInstallmentPlan = useTransactionStore((state) => state.updateInstallmentPlan)
  const removeInstallmentPlan = useTransactionStore((state) => state.removeInstallmentPlan)
  const updateContractConfig = useTransactionStore((state) => state.updateContractConfig)

  const currentMonth = getCurrentMonthKey()
  const firstCardId = cards[0]?.id || ""

  const [fixedName, setFixedName] = useState("")
  const [fixedAmount, setFixedAmount] = useState("")
  const [fixedCategoryId, setFixedCategoryId] = useState(defaultCategories[0].id)
  const [fixedSubcategoryId, setFixedSubcategoryId] = useState(
    defaultCategories[0].subcategories[0].id
  )
  const [fixedPaymentMethod, setFixedPaymentMethod] = useState<"cash" | "credit">("cash")
  const [fixedCardId, setFixedCardId] = useState(firstCardId)
  const [editingFixedCostId, setEditingFixedCostId] = useState("")

  const [installmentName, setInstallmentName] = useState("")
  const [installmentValue, setInstallmentValue] = useState("")
  const [installmentTotal, setInstallmentTotal] = useState("")
  const [installmentPaymentMethod, setInstallmentPaymentMethod] = useState<
    "cash" | "credit"
  >("cash")
  const [installmentCardId, setInstallmentCardId] = useState(firstCardId)
  const [installmentStartMonth, setInstallmentStartMonth] = useState(currentMonth)
  const [editingInstallmentId, setEditingInstallmentId] = useState("")

  const [hourlyRateInput, setHourlyRateInput] = useState(
    formatCurrencyFromNumber(contractConfig.hourlyRate)
  )
  const [cltNetSalaryInput, setCltNetSalaryInput] = useState(
    formatCurrencyFromNumber(contractConfig.cltNetSalary)
  )

  const [wizardStep, setWizardStep] = useState<0 | 1>(0)
  const [highlightedSection, setHighlightedSection] = useState<"income" | "fixed" | "installment" | null>(null)
  const incomeSectionRef = useRef<HTMLDivElement | null>(null)
  const fixedSectionRef = useRef<HTMLDivElement | null>(null)
  const installmentSectionRef = useRef<HTMLDivElement | null>(null)

  const selectedFixedCategory = useMemo(
    () =>
      defaultCategories.find((category) => category.id === fixedCategoryId) ||
      defaultCategories[0],
    [fixedCategoryId]
  )

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
    setFixedPaymentMethod(cost.paymentMethod)
    setFixedCardId(cost.cardId || firstCardId)
  }, [searchParams, fixedCosts, firstCardId])

  useEffect(() => {
    const editIncome = searchParams.get("editIncome")
    if (editIncome !== "1") {
      return
    }

    setHighlightedSection("income")
    requestAnimationFrame(() => {
      incomeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    })

    const timer = window.setTimeout(() => {
      setHighlightedSection((current) => (current === "income" ? null : current))
    }, 2200)

    return () => window.clearTimeout(timer)
  }, [searchParams])

  useEffect(() => {
    const editingId = searchParams.get("editFixedCostId")
    if (!editingId || wizardStep !== 0) {
      return
    }

    setHighlightedSection("fixed")
    requestAnimationFrame(() => {
      fixedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    })

    const timer = window.setTimeout(() => {
      setHighlightedSection((current) => (current === "fixed" ? null : current))
    }, 2200)

    return () => window.clearTimeout(timer)
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
    setInstallmentPaymentMethod(plan.paymentMethod)
    setInstallmentCardId(plan.cardId || firstCardId)
    setInstallmentStartMonth(plan.startMonth)
  }, [searchParams, installmentPlans, firstCardId])

  useEffect(() => {
    const editingId = searchParams.get("editInstallmentId")
    if (!editingId || wizardStep !== 1) {
      return
    }

    setHighlightedSection("installment")
    requestAnimationFrame(() => {
      installmentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    })

    const timer = window.setTimeout(() => {
      setHighlightedSection((current) => (current === "installment" ? null : current))
    }, 2200)

    return () => window.clearTimeout(timer)
  }, [searchParams, wizardStep])

  function getPaymentLabel(paymentMethod: "cash" | "credit", cardId?: string) {
    if (paymentMethod !== "credit") {
      return "Conta/Débito"
    }

    const card = cards.find((item) => item.id === cardId)
    return card ? `Crédito - ${card.name}` : "Crédito"
  }

  function addFixed() {
    if (!fixedName || !fixedAmount) {
      alert("Preencha nome e valor do gasto fixo.")
      return
    }
    if (fixedPaymentMethod === "credit" && !fixedCardId) {
      alert("Selecione um cartão para gasto fixo no crédito.")
      return
    }

    if (editingFixedCostId) {
      const target = fixedCosts.find((item) => item.id === editingFixedCostId)
      if (!target) {
        setEditingFixedCostId("")
        return
      }

      updateFixedCost({
        ...target,
        name: fixedName,
        amount: parseCurrencyInput(fixedAmount),
        categoryId: fixedCategoryId,
        subcategoryId: fixedSubcategoryId,
        paymentMethod: fixedPaymentMethod,
        cardId: fixedPaymentMethod === "credit" ? fixedCardId : undefined
      })

      setEditingFixedCostId("")
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams)
        nextParams.delete("editFixedCostId")
        return nextParams
      })
    } else {
      addFixedCost({
        id: crypto.randomUUID(),
        name: fixedName,
        amount: parseCurrencyInput(fixedAmount),
        categoryId: fixedCategoryId,
        subcategoryId: fixedSubcategoryId,
        paymentMethod: fixedPaymentMethod,
        cardId: fixedPaymentMethod === "credit" ? fixedCardId : undefined
      })
    }

    setFixedName("")
    setFixedAmount("")
    setFixedCategoryId(defaultCategories[0].id)
    setFixedSubcategoryId(defaultCategories[0].subcategories[0].id)
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
    setFixedPaymentMethod(cost.paymentMethod)
    setFixedCardId(cost.cardId || firstCardId)
  }

  function cancelEditingFixed() {
    setEditingFixedCostId("")
    setFixedName("")
    setFixedAmount("")
    setFixedCategoryId(defaultCategories[0].id)
    setFixedSubcategoryId(defaultCategories[0].subcategories[0].id)
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.delete("editFixedCostId")
      return nextParams
    })
  }

  function addInstallment() {
    if (!installmentName || !installmentValue || !installmentTotal || !installmentStartMonth) {
      alert("Preencha nome, valor, total de parcelas e mês inicial.")
      return
    }
    if (installmentPaymentMethod === "credit" && !installmentCardId) {
      alert("Selecione um cartão para parcelamento no crédito.")
      return
    }

    if (editingInstallmentId) {
      const target = installmentPlans.find((item) => item.id === editingInstallmentId)
      if (!target) {
        setEditingInstallmentId("")
        return
      }

      updateInstallmentPlan({
        ...target,
        name: installmentName,
        installmentValue: parseCurrencyInput(installmentValue),
        totalInstallments: Number(installmentTotal),
        startMonth: installmentStartMonth,
        paymentMethod: installmentPaymentMethod,
        cardId: installmentPaymentMethod === "credit" ? installmentCardId : undefined
      })
      setEditingInstallmentId("")
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams)
        nextParams.delete("editInstallmentId")
        return nextParams
      })
    } else {
      addInstallmentPlan({
        id: crypto.randomUUID(),
        name: installmentName,
        installmentValue: parseCurrencyInput(installmentValue),
        totalInstallments: Number(installmentTotal),
        startMonth: installmentStartMonth,
        paymentMethod: installmentPaymentMethod,
        cardId: installmentPaymentMethod === "credit" ? installmentCardId : undefined
      })
    }

    setInstallmentName("")
    setInstallmentValue("")
    setInstallmentTotal("")
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
    setInstallmentPaymentMethod(plan.paymentMethod)
    setInstallmentCardId(plan.cardId || firstCardId)
    setInstallmentStartMonth(plan.startMonth)
    setWizardStep(1)
    setHighlightedSection("installment")
    requestAnimationFrame(() => {
      installmentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }

  function cancelEditingInstallment() {
    setEditingInstallmentId("")
    setInstallmentName("")
    setInstallmentValue("")
    setInstallmentTotal("")
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.delete("editInstallmentId")
      return nextParams
    })
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
              </>
            ) : (
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
              <div className="grid gap-2">
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    className={inputClassName}
                    placeholder="Nome"
                    value={fixedName}
                    onChange={(event) => setFixedName(event.target.value)}
                  />
                  <input
                    className={inputClassName}
                    type="text"
                    inputMode="decimal"
                    placeholder="Valor"
                    value={fixedAmount}
                    onChange={(event) => setFixedAmount(formatCurrencyInput(event.target.value))}
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <SelectField
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
                  value={fixedPaymentMethod}
                  onChange={(event) => setFixedPaymentMethod(event.target.value as "cash" | "credit")}
                >
                  <option value="cash">Conta/Débito</option>
                  <option value="credit">Cartão de crédito</option>
                </SelectField>
                {fixedPaymentMethod === "credit" && (
                  <SelectField value={fixedCardId} onChange={(event) => setFixedCardId(event.target.value)}>
                    <option value="">Selecionar cartão</option>
                    <option value="other">Outros</option>
                    {cards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </SelectField>
                )}
                <button
                  className="rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400"
                  onClick={addFixed}
                >
                  {editingFixedCostId ? "Salvar edição" : "Adicionar"}
                </button>
                {editingFixedCostId && (
                  <button
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                    onClick={cancelEditingFixed}
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
              <div className="mt-3 space-y-2">
                {fixedCosts.map((cost) => (
                  <div
                    key={cost.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs text-zinc-300 ${
                      editingFixedCostId === cost.id
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : "border-zinc-800"
                    }`}
                  >
                    <span>
                      {cost.name} · {formatCurrency(cost.amount)}
                      <span className="ml-2 text-zinc-500">
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
                          return subcategory ? `${category.name} / ${subcategory.name}` : category.name
                        })()}
                      </span>
                      <span className="ml-2 text-zinc-500">
                        {getPaymentLabel(cost.paymentMethod, cost.cardId)}
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-zinc-500 hover:text-zinc-200"
                        onClick={() => startEditingFixed(cost.id)}
                      >
                        editar
                      </button>
                      <button
                        className="text-zinc-500 hover:text-zinc-200"
                        onClick={() => removeFixedCost(cost.id)}
                      >
                        remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wizardStep === 1 && (
            <div
              ref={installmentSectionRef}
              className={`rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition ${
                highlightedSection === "installment" ? "ring-2 ring-emerald-500 animate-pulse" : ""
              }`}
            >
              <h2 className="mb-3 text-sm font-semibold text-zinc-100">Parcelamentos</h2>
              <div className="grid gap-2">
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    className={inputClassName}
                    placeholder="Nome"
                    value={installmentName}
                    onChange={(event) => setInstallmentName(event.target.value)}
                  />
                  <input
                    className={inputClassName}
                    type="text"
                    inputMode="decimal"
                    placeholder="Valor da parcela"
                    value={installmentValue}
                    onChange={(event) => setInstallmentValue(formatCurrencyInput(event.target.value))}
                  />
                </div>
                <input
                  className={inputClassName}
                  type="number"
                  min="1"
                  placeholder="Total parcelas"
                  value={installmentTotal}
                  onChange={(event) => setInstallmentTotal(event.target.value)}
                />
                <SelectField
                  value={installmentPaymentMethod}
                  onChange={(event) =>
                    setInstallmentPaymentMethod(event.target.value as "cash" | "credit")
                  }
                >
                  <option value="cash">Conta/Débito</option>
                  <option value="credit">Cartão de crédito</option>
                </SelectField>
                {installmentPaymentMethod === "credit" && (
                  <SelectField
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
                )}
                <div className="grid gap-2 md:grid-cols-2">
                  <SelectField
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
                  <SelectField
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
                </div>
                <button
                  className="rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400"
                  onClick={addInstallment}
                >
                  {editingInstallmentId ? "Salvar edição" : "Adicionar"}
                </button>
                {editingInstallmentId && (
                  <button
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                    onClick={cancelEditingInstallment}
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
              <div className="mt-3 space-y-2">
                {installmentPlans.map((plan) => {
                  const progress = getInstallmentProgress(plan, currentMonth)
                  return (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300"
                    >
                      <span>
                        {plan.name} · {formatCurrency(plan.installmentValue)} ·{" "}
                        {progress.isActive
                          ? `${progress.currentInstallment}/${plan.totalInstallments}`
                          : "encerrado"}
                        <span className="ml-2 text-zinc-500">
                          {getPaymentLabel(plan.paymentMethod, plan.cardId)}
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-zinc-500 hover:text-zinc-200"
                          onClick={() => startEditingInstallment(plan.id)}
                        >
                          editar
                        </button>
                        <button
                          className="text-zinc-500 hover:text-zinc-200"
                          onClick={() => removeInstallmentPlan(plan.id)}
                        >
                          remover
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
