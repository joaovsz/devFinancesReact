import { useEffect, useMemo, useRef, useState } from "react"
import { Path, PathValue, useForm } from "react-hook-form"
import { motion } from "framer-motion"
import { CalendarDays, ChevronDown } from "lucide-react"
import { Category } from "../../types/finance"
import { CreditCard } from "../../types/card"
import { PaymentMethod, Transaction } from "../../types/transaction"
import {
  TransactionFormValues,
  transactionFormSchema,
  transactionSchema
} from "../../schemas"
import { parseCurrencyInput } from "../../utils/currency-input"
import { useTransactionStore } from "../../store/useTransactionStore"
import { getOperationalDateForMonth } from "../../utils/projections"

type TransactionFormProps = {
  categories: Category[]
  cards: CreditCard[]
  initialCreditCardId?: string
  existingTransactions: Transaction[]
  editingTransaction?: Transaction | null
  onSubmitTransaction: (transaction: Transaction) => void
  onCancelEdit?: () => void
}

const quickValueChips = [10, 25, 50, 100, 200]
const numpadKeys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "00", "0", "⌫"]
const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Conta" },
  { value: "debit", label: "Débito" },
  { value: "pix", label: "Pix" },
  { value: "bank-transfer", label: "Transferência" },
  { value: "bank-slip", label: "Boleto" },
  { value: "cash-money", label: "Dinheiro" },
  { value: "credit", label: "Crédito" }
]
const selectClassName =
  "w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
const inputClassName =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
const labelClassName = "grid gap-1 text-xs font-medium text-zinc-400"

function formatDateLabel(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return "Selecionar data"
  }

  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
}

function getInitialCardId(cards: CreditCard[], initialCreditCardId?: string) {
  if (initialCreditCardId && cards.some((card) => card.id === initialCreditCardId)) {
    return initialCreditCardId
  }

  return cards[0]?.id || ""
}

function getInitialPaymentMethod(cards: CreditCard[], initialCreditCardId?: string): PaymentMethod {
  return getInitialCardId(cards, initialCreditCardId) ? "credit" : "cash"
}

function getDefaultFormValues(
  categories: Category[],
  cards: CreditCard[],
  activeMonthKey: string,
  initialCreditCardId?: string
): TransactionFormValues {
  const firstCategory = categories.find((category) => category.id !== "rendas") || categories[0]
  const firstSubcategory = firstCategory?.subcategories[0]

  return {
    label: "",
    amountCents: 0,
    date: getOperationalDateForMonth(activeMonthKey),
    type: 2,
    paymentMethod: getInitialPaymentMethod(cards, initialCreditCardId),
    cardId: getInitialCardId(cards, initialCreditCardId),
    categoryId: firstCategory?.id || "",
    subcategoryId: firstSubcategory?.id || "",
    tagsInput: "",
    competenceMonth: ""
  }
}

function getFormValuesFromTransaction(transaction: Transaction): TransactionFormValues {
  return {
    label: transaction.label,
    amountCents: toCents(transaction.value),
    date: transaction.date,
    type: transaction.type as TransactionFormValues["type"],
    paymentMethod: transaction.type === 1 ? "cash" : transaction.paymentMethod,
    cardId: transaction.cardId || "",
    categoryId: transaction.categoryId,
    subcategoryId: transaction.subcategoryId,
    tagsInput: transaction.tags.join(", "),
    competenceMonth: transaction.competenceMonth || ""
  }
}

function normalizeDuplicateText(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR")
}

function toCents(value: number) {
  return Math.round(value * 100)
}

export const TransactionForm = ({
  categories,
  cards,
  initialCreditCardId,
  existingTransactions,
  editingTransaction,
  onSubmitTransaction,
  onCancelEdit
}: TransactionFormProps) => {
  const activeMonthKey = useTransactionStore((state) => state.activeMonthKey)
  const {
    getValues,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors }
  } = useForm<TransactionFormValues>({
    defaultValues: getDefaultFormValues(categories, cards, activeMonthKey, initialCreditCardId)
  })
  const [showMissingCardModal, setShowMissingCardModal] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const isEditing = Boolean(editingTransaction)
  const formValues = watch()
  const {
    label,
    amountCents,
    date,
    type: option,
    paymentMethod,
    cardId,
    categoryId,
    subcategoryId,
    tagsInput,
    competenceMonth
  } = formValues

  function updateField<K extends Path<TransactionFormValues>>(
    name: K,
    value: PathValue<TransactionFormValues, K>
  ) {
    setValue(name, value, { shouldDirty: true, shouldValidate: false })
  }

  function openDatePicker() {
    try {
      (dateInputRef.current as HTMLInputElement & { showPicker?: () => void })?.showPicker?.()
    } catch {
      dateInputRef.current?.click()
    }
  }

  const filteredCategories = useMemo(
    () => option === 2 ? categories.filter((c) => c.id !== "rendas") : categories,
    [categories, option]
  )

  const selectedCategory = useMemo(
    () => filteredCategories.find((category) => category.id === categoryId) || filteredCategories[0],
    [filteredCategories, categoryId]
  )

  useEffect(() => {
    if (editingTransaction) {
      return
    }

    if (!cardId && cards[0]?.id) {
      updateField("cardId", getInitialCardId(cards, initialCreditCardId))
    }
  }, [cards, cardId, editingTransaction, initialCreditCardId])

  useEffect(() => {
    if (editingTransaction) {
      return
    }

    if (!initialCreditCardId || !cards.some((card) => card.id === initialCreditCardId)) {
      return
    }

    updateField("type", 2)
    updateField("paymentMethod", "credit")
    updateField("cardId", initialCreditCardId)
  }, [initialCreditCardId, cards, editingTransaction])

  useEffect(() => {
    if (editingTransaction) {
      return
    }

    updateField("date", getOperationalDateForMonth(activeMonthKey))
    if (getValues("competenceMonth")) {
      updateField("competenceMonth", activeMonthKey)
    }
  }, [activeMonthKey, editingTransaction])

  useEffect(() => {
    if (!editingTransaction) {
      return
    }

    reset(getFormValuesFromTransaction(editingTransaction))
  }, [editingTransaction, reset])

  function formatCents(cents: number) {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })
  }

  function parseTags() {
    const typedTags = tagsInput
      .split(",")
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter((tag) => tag.length > 0)

    return Array.from(new Set(typedTags))
  }

  function resetValues() {
    reset(getDefaultFormValues(categories, cards, activeMonthKey, initialCreditCardId))
  }

  function addQuickValue(amount: number) {
    updateField("amountCents", amountCents + amount * 100)
  }

  function pressNumpad(key: string) {
    if (key === "⌫") {
      updateField("amountCents", Math.floor(amountCents / 10))
      return
    }

    const next = Number(String(amountCents) + key)
    updateField("amountCents", Number.isFinite(next) ? next : amountCents)
  }

  function selectTransaction(transactionType: number) {
    updateField("type", transactionType as TransactionFormValues["type"])
    if (transactionType === 1) {
      updateField("paymentMethod", "cash")
      updateField("cardId", "")
      return
    }

    if (categoryId === "rendas") {
      const firstExpenseCategory = categories.find((c) => c.id !== "rendas") || categories[0]
      updateField("categoryId", firstExpenseCategory.id)
      updateField("subcategoryId", firstExpenseCategory.subcategories[0].id)
    }

    if (paymentMethod === "cash" && cards.length > 0) {
      updateField("paymentMethod", "credit")
      updateField("cardId", getInitialCardId(cards, initialCreditCardId))
    }
  }

  function handleCategory(nextCategoryId: string) {
    const nextCategory =
      filteredCategories.find((category) => category.id === nextCategoryId) || filteredCategories[0]
    updateField("categoryId", nextCategory.id)
    updateField("subcategoryId", nextCategory.subcategories[0].id)
  }

  function handlePaymentMethod(nextPaymentMethod: PaymentMethod) {
    if (nextPaymentMethod === "credit" && cards.length === 0) {
      setShowMissingCardModal(true)
      updateField("paymentMethod", "cash")
      updateField("cardId", "")
      return
    }

    updateField("paymentMethod", nextPaymentMethod)
    if (nextPaymentMethod === "credit") {
      updateField("cardId", getInitialCardId(cards, initialCreditCardId))
      return
    }

    updateField("cardId", "")
  }

  function submitTransaction(values: TransactionFormValues) {
    const parsedForm = transactionFormSchema.safeParse(values)
    if (!parsedForm.success) {
      setError("root", {
        message: parsedForm.error.issues[0]?.message || "Revise os dados do lançamento."
      })
      return
    }

    const formData = parsedForm.data
    const isCreditExpense = formData.type === 2 && formData.paymentMethod === "credit"
    const fallbackLabel =
      selectedCategory.subcategories.find((subcategory) => subcategory.id === formData.subcategoryId)
        ?.name || selectedCategory.name
    const transactionLabel = formData.label.trim() || fallbackLabel
    const transactionPaymentMethod = formData.type === 1 ? "cash" : formData.paymentMethod
    const transactionCardId = isCreditExpense ? formData.cardId : undefined

    const nextTransaction = {
      id: editingTransaction?.id || crypto.randomUUID(),
      createdAt: editingTransaction?.createdAt || new Date().toISOString(),
      label: transactionLabel,
      value: formData.amountCents / 100,
      date: formData.date,
      type: formData.type,
      paymentMethod: transactionPaymentMethod,
      cardId: transactionCardId,
      categoryId: formData.categoryId,
      subcategoryId: formData.subcategoryId,
      tags: parseTags(),
      competenceMonth: formData.type === 1 && formData.competenceMonth
        ? formData.competenceMonth
        : undefined
    }

    const parsedTransaction = transactionSchema.safeParse(nextTransaction)
    if (!parsedTransaction.success) {
      setError("root", {
        message: parsedTransaction.error.issues[0]?.message || "Revise os dados do lançamento."
      })
      return
    }

    const duplicateTransaction = existingTransactions.some(
      (transaction) =>
        transaction.date === formData.date &&
        transaction.id !== editingTransaction?.id &&
        transaction.type === formData.type &&
        transaction.paymentMethod === transactionPaymentMethod &&
        (transaction.cardId || undefined) === transactionCardId &&
        transaction.categoryId === formData.categoryId &&
        transaction.subcategoryId === formData.subcategoryId &&
        toCents(transaction.value) === formData.amountCents &&
        normalizeDuplicateText(transaction.label) === normalizeDuplicateText(transactionLabel)
    )

    if (duplicateTransaction) {
      setError("root", {
        message: "Já existe uma transação idêntica nessa data, cartão, categoria e valor."
      })
      return
    }

    onSubmitTransaction(parsedTransaction.data)
    resetValues()
    onCancelEdit?.()
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
          {isEditing ? "Editar lançamento" : "Lançamento rápido"}
        </h2>
        {isEditing && (
          <button
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            onClick={() => {
              resetValues()
              onCancelEdit?.()
            }}
            type="button"
          >
            Cancelar edição
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-3 text-sm text-zinc-400">Valor</div>
          <div className="mb-3 text-3xl font-semibold text-zinc-100">{formatCents(amountCents)}</div>
          <label className={`${labelClassName} mb-3`}>
            Valor da transação
            <input
              className={inputClassName}
              type="text"
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={amountCents > 0 ? formatCents(amountCents) : ""}
              onChange={(event) =>
                updateField(
                  "amountCents",
                  Math.round(parseCurrencyInput(event.target.value) * 100)
                )
              }
            />
          </label>
          <div className="mb-3 flex flex-wrap gap-2">
            {quickValueChips.map((chipValue) => (
              <button
                key={chipValue}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-emerald-500 hover:text-emerald-300"
                onClick={(event) => {
                  event.preventDefault()
                  addQuickValue(chipValue)
                }}
              >
                +R$ {chipValue}
              </button>
            ))}
            <button
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-amber-500 hover:text-amber-300"
              onClick={(event) => {
                event.preventDefault()
                updateField("amountCents", 0)
              }}
            >
              Limpar
            </button>
          </div>
          <label className={`${labelClassName} mb-3`}>
            Ajuste rápido do valor
            <input
              className="w-full accent-emerald-500"
              type="range"
              min="0"
              max="500000"
              step="500"
              value={amountCents}
              onChange={(event) => updateField("amountCents", Number(event.target.value))}
            />
          </label>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2.5">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
              Teclado numérico
            </div>
            <div className="grid grid-cols-3 gap-2">
              {numpadKeys.map((key) => {
                const isDeleteKey = key === "⌫"
                const isDoubleZeroKey = key === "00"
                return (
                  <button
                    key={key}
                    className={`h-11 rounded-xl border text-base font-semibold transition active:scale-[0.98] ${
                      isDeleteKey
                        ? "border-rose-500/45 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                        : isDoubleZeroKey
                          ? "border-indigo-500/45 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
                          : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-emerald-500 hover:text-emerald-300"
                    }`}
                    onClick={(event) => {
                      event.preventDefault()
                      pressNumpad(key)
                    }}
                  >
                    {key}
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid content-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
          onSubmit={handleSubmit(submitTransaction)}
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                option === 1
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300"
              }`}
              onClick={(event) => {
                event.preventDefault()
                selectTransaction(1)
              }}
            >
              Ganho
            </button>
            <button
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                option === 2
                  ? "border-amber-500 bg-amber-500/15 text-amber-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300"
              }`}
              onClick={(event) => {
                event.preventDefault()
                selectTransaction(2)
              }}
            >
              Despesa
            </button>
          </div>

          <div className={option === 1 ? "grid grid-cols-2 gap-2" : ""}>
            <label className={labelClassName}>
              Data
              <div
                className="relative flex h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 transition hover:border-zinc-500 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30"
                onClick={openDatePicker}
              >
                <CalendarDays size={16} className="text-zinc-400" />
                <span className="truncate">{formatDateLabel(date)}</span>
                <input
                  ref={dateInputRef}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  type="date"
                  value={date}
                  onChange={(event) => updateField("date", event.target.value)}
                  aria-label="Data da transação"
                />
              </div>
            </label>
            {option === 1 && (
              <label className={labelClassName}>
                Mês de competência
                <div className="relative">
                  <select
                    className={selectClassName}
                    value={competenceMonth}
                    onChange={(event) => updateField("competenceMonth", event.target.value)}
                  >
                    <option value="">Mês Atual</option>
                    {(() => {
                      const now = new Date()
                      const year = now.getFullYear()
                      const isDecember = now.getMonth() === 11
                      const totalMonths = isDecember ? 13 : 12
                      return Array.from({ length: totalMonths }, (_, i) => {
                        const d = new Date(year, i, 1)
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
                        const monthLabel = d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
                        return (
                          <option key={key} value={key}>
                            {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
                          </option>
                        )
                      })
                    })()}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                </div>
              </label>
            )}
          </div>
          {option === 1 && competenceMonth && competenceMonth !== date.slice(0, 7) && (
            <span className="text-[11px] text-indigo-300">
              ⏳ Esta renda será contabilizada em{" "}
              {new Date(`${competenceMonth}-01T00:00:00`).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric"
              })}
            </span>
          )}
          <label className={labelClassName}>
            Descrição
            <input
              className={inputClassName}
              type="text"
              placeholder="Descrição opcional"
              value={label}
              onChange={(event) => updateField("label", event.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className={labelClassName}>
              Categoria
              <div className="relative">
                <select
                  className={selectClassName}
                  value={categoryId}
                  onChange={(event) => handleCategory(event.target.value)}
                >
                  {filteredCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </label>
            <label className={labelClassName}>
              Subcategoria
              <div className="relative">
                <select
                  className={selectClassName}
                  value={subcategoryId}
                  onChange={(event) => updateField("subcategoryId", event.target.value)}
                >
                  {selectedCategory.subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className={labelClassName}>
              Forma de pagamento
              <div className="relative">
                <select
                  className={`${selectClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                  value={paymentMethod}
                  onChange={(event) => handlePaymentMethod(event.target.value as PaymentMethod)}
                  disabled={option === 1}
                >
                  {paymentMethodOptions.map((option) => (
                    <option key={`transaction-payment-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </label>
            <label className={labelClassName}>
              Cartão
              <div className="relative">
                <select
                  className={`${selectClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                  value={cardId}
                  onChange={(event) => updateField("cardId", event.target.value)}
                  disabled={!(option === 2 && paymentMethod === "credit")}
                >
                  {cards.length === 0 && <option value="">Nenhum cartão cadastrado</option>}
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </label>
          </div>
          {option === 2 && paymentMethod === "credit" && (
            <p className="rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">
              Vincule essa saída a um cartão de crédito cadastrado
            </p>
          )}

          <label className={labelClassName}>
            Tags
            <input
              className={inputClassName}
              type="text"
              placeholder="Separadas por vírgula"
              value={tagsInput}
              onChange={(event) => updateField("tagsInput", event.target.value)}
            />
          </label>

          <button
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400"
            type="submit"
          >
            {isEditing ? "Atualizar transação" : "Lançar transação"}
          </button>
          {errors.root?.message && (
            <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {errors.root.message}
            </p>
          )}
        </motion.form>
      </div>
      {showMissingCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl shadow-zinc-950/60">
            <h3 className="text-lg font-semibold text-zinc-100">Cartão de crédito necessário</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Adicione um cartão de crédito na tela inicial antes de vincular uma saída ao crédito.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400"
                onClick={() => setShowMissingCardModal(false)}
                type="button"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
