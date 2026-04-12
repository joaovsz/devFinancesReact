import { MouseEvent, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { v4 as uuid } from "uuid"
import { CalendarDays, ChevronDown } from "lucide-react"
import { Category } from "../../types/finance"
import { CreditCard } from "../../types/card"
import { Transaction } from "../../types/transaction"

type TransactionFormProps = {
  categories: Category[]
  cards: CreditCard[]
  existingTransactions: Transaction[]
  onSubmitTransaction: (transaction: Transaction) => void
}

const quickValueChips = [10, 25, 50, 100, 200]
const numpadKeys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "00", "0", "⌫"]
const selectClassName =
  "w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"

function getTodayDate() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

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

export const TransactionForm = ({
  categories,
  cards,
  existingTransactions,
  onSubmitTransaction
}: TransactionFormProps) => {
  const [label, setLabel] = useState("")
  const [amountCents, setAmountCents] = useState(0)
  const [date, setDate] = useState(getTodayDate())
  const [option, setOption] = useState(2)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("credit")
  const [cardId, setCardId] = useState(cards[0]?.id || "")
  const [categoryId, setCategoryId] = useState(categories[0].id)
  const [subcategoryId, setSubcategoryId] = useState(categories[0].subcategories[0].id)
  const [tagsInput, setTagsInput] = useState("")
  const dateInputRef = useRef<HTMLInputElement>(null)

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) || categories[0],
    [categories, categoryId]
  )

  useEffect(() => {
    if (!cardId && cards[0]?.id) {
      setCardId(cards[0].id)
    }
  }, [cards, cardId])

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
    setLabel("")
    setAmountCents(0)
    setDate(getTodayDate())
    setOption(2)
    setPaymentMethod("credit")
    setCardId(cards[0]?.id || "")
    setCategoryId(categories[0].id)
    setSubcategoryId(categories[0].subcategories[0].id)
    setTagsInput("")
  }

  function addQuickValue(amount: number) {
    setAmountCents((currentCents) => currentCents + amount * 100)
  }

  function pressNumpad(key: string) {
    if (key === "⌫") {
      setAmountCents((currentCents) => Math.floor(currentCents / 10))
      return
    }

    setAmountCents((currentCents) => {
      const raw = String(currentCents) + key
      const next = Number(raw)
      return Number.isFinite(next) ? next : currentCents
    })
  }

  function selectTransaction(transactionType: number) {
    setOption(transactionType)
    if (transactionType === 1) {
      setPaymentMethod("cash")
    }
  }

  function handleCategory(nextCategoryId: string) {
    const nextCategory =
      categories.find((category) => category.id === nextCategoryId) || categories[0]
    setCategoryId(nextCategory.id)
    setSubcategoryId(nextCategory.subcategories[0].id)
  }

  function submitTransaction(e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) {
    e.preventDefault()
    const isCreditExpense = option === 2 && paymentMethod === "credit"
    if (!date || amountCents <= 0) {
      alert("Valor e data são obrigatórios")
      return
    }
    if (isCreditExpense && !cardId) {
      alert("Selecione um cartão para despesas no crédito")
      return
    }

    const fallbackLabel =
      selectedCategory.subcategories.find((subcategory) => subcategory.id === subcategoryId)
        ?.name || selectedCategory.name

    const duplicateTransaction = existingTransactions.some(
      (transaction) =>
        transaction.categoryId === categoryId &&
        transaction.subcategoryId === subcategoryId &&
        transaction.value === amountCents / 100
    )

    if (duplicateTransaction) {
      alert("Já existe uma transação com a mesma categoria e o mesmo valor.")
      return
    }

    onSubmitTransaction({
      id: uuid(),
      label: label.trim() || fallbackLabel,
      value: amountCents / 100,
      date: date.toString(),
      type: option,
      paymentMethod: option === 1 ? "cash" : paymentMethod,
      cardId: isCreditExpense ? cardId : undefined,
      categoryId,
      subcategoryId,
      tags: parseTags()
    })
    resetValues()
  }

  function openDatePicker(e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) {
    e.preventDefault()
    const input = dateInputRef.current
    if (!input) {
      return
    }

    const pickerInput = input as HTMLInputElement & { showPicker?: () => void }
    if (typeof pickerInput.showPicker === "function") {
      pickerInput.showPicker()
      return
    }

    input.focus()
    input.click()
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-300">
        Lançamento rápido
      </h2>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-3 text-sm text-zinc-400">Valor</div>
          <div className="mb-3 text-3xl font-semibold text-zinc-100">{formatCents(amountCents)}</div>
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
                setAmountCents(0)
              }}
            >
              Limpar
            </button>
          </div>
          <input
            className="mb-3 w-full accent-emerald-500"
            type="range"
            min="0"
            max="500000"
            step="500"
            value={amountCents}
            onChange={(event) => setAmountCents(Number(event.target.value))}
          />
          <div className="grid grid-cols-3 gap-2">
            {numpadKeys.map((key) => (
              <button
                key={key}
                className="rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-emerald-500 hover:text-emerald-300"
                onClick={(event) => {
                  event.preventDefault()
                  pressNumpad(key)
                }}
              >
                {key}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid content-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
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

          <button
            className="relative flex h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 transition hover:border-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            onClick={openDatePicker}
          >
            <CalendarDays size={16} className="text-zinc-400" />
            <span className="truncate">{formatDateLabel(date)}</span>
          </button>
          <input
            ref={dateInputRef}
            className="sr-only"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <input
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            type="text"
            placeholder="Descrição (opcional)"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select
                className={selectClassName}
                value={categoryId}
                onChange={(event) => handleCategory(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            </div>
            <div className="relative">
              <select
                className={selectClassName}
                value={subcategoryId}
                onChange={(event) => setSubcategoryId(event.target.value)}
              >
                {selectedCategory.subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select
                className={`${selectClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as "cash" | "credit")}
                disabled={option === 1}
              >
                <option value="cash">Conta / Débito</option>
                <option value="credit">Crédito</option>
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            </div>
            <div className="relative">
              <select
                className={`${selectClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                value={cardId}
                onChange={(event) => setCardId(event.target.value)}
                disabled={!(option === 2 && paymentMethod === "credit")}
              >
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>

          <input
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            type="text"
            placeholder="Tags adicionais (separadas por vírgula)"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
          />

          <button
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400"
            onClick={submitTransaction}
          >
            Lançar transação
          </button>
        </motion.form>
      </div>
    </section>
  )
}
