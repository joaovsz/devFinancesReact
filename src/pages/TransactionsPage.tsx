import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useSearchParams } from "react-router-dom"
import { ChevronDown, Info, X } from "lucide-react"
import { Table } from "../components/Table"
import { TransactionForm } from "../components/transactions/TransactionForm"
import { defaultCategories } from "../data/categories"
import { useTransactionStore } from "../store/useTransactionStore"

export const TransactionsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const cards = useTransactionStore((state) => state.cards)
  const transactions = useTransactionStore((state) => state.transactions)
  const addTransaction = useTransactionStore((state) => state.addTransaction)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilters, setTypeFilters] = useState<string[]>([])
  const [selectedCardId, setSelectedCardId] = useState(searchParams.get("cardId") || "all")
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const quickAddCreditCardId =
    searchParams.get("action") === "add-expense" ? searchParams.get("cardId") || undefined : undefined
  const availableTypeFilters = ["Entrada", "Saída", "Gasto fixo", "Parcelamento", "Faturamento"]
  const selectClassName =
    "w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
  const formRef = useRef<HTMLDivElement | null>(null)
  const tableRef = useRef<HTMLDivElement | null>(null)

  function toggleTypeFilter(type: string) {
    setTypeFilters((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    )
  }

  function handleCardFilterChange(cardId: string) {
    setSelectedCardId(cardId)
    const next = new URLSearchParams(searchParams)
    if (cardId === "all") {
      next.delete("cardId")
    } else {
      next.set("cardId", cardId)
    }
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    const action = searchParams.get("action")
    if (action === "add-expense") {
      requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
      return
    }

    const cardId = searchParams.get("cardId")
    if (!cardId) {
      return
    }

    // After navigating from "Ver fatura", focus the table.
    requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [searchParams])

  return (
    <div className="flex min-h-0 flex-col gap-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Transações</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Registre entradas e saídas rápidas, acompanhe itens planejados e filtre sua
              movimentação por tipo, cartão ou descrição.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100 sm:text-sm"
            onClick={() => setIsGuideOpen((current) => !current)}
            type="button"
            aria-label="Como funciona a lista e adição de transações"
            title="Como funciona"
          >
            <Info size={16} />
            Como funciona
          </button>
        </div>

        <AnimatePresence>
          {isGuideOpen && (
            <motion.div
              className="mt-4 rounded-xl border border-zinc-700/80 bg-zinc-950/80 p-4 shadow-2xl shadow-zinc-950/30"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-100">
                  Guia rápido de transações
                </h2>
                <button
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                  onClick={() => setIsGuideOpen(false)}
                  type="button"
                  aria-label="Fechar guia de transações"
                >
                  <X size={14} />
                </button>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                <li>
                  • Use o lançamento rápido para registrar entradas e saídas reais com
                  categoria, subcategoria, forma de pagamento e tags.
                </li>
                <li>
                  • Saídas no crédito devem ser vinculadas a um cartão cadastrado para
                  aparecerem na fatura e no uso de limite.
                </li>
                <li>
                  • A lista reúne transações reais e itens planejados. Itens planejados
                  levam para a tela de Planejamento quando precisam de edição.
                </li>
                <li>
                  • Use busca, filtros por tipo e filtro por cartão para revisar lançamentos
                  sem mexer nos dados.
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      <div ref={formRef}>
        <TransactionForm
          categories={defaultCategories}
          cards={cards}
          initialCreditCardId={quickAddCreditCardId}
          existingTransactions={transactions}
          onSubmitTransaction={addTransaction}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-300">Filtrar por:</span>
        <input
          className="min-w-[220px] flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          type="text"
          placeholder="Buscar por descrição, categoria, pagamento..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <div className="relative min-w-[220px] sm:max-w-xs">
          <select
            className={selectClassName}
            value={selectedCardId}
            onChange={(event) => handleCardFilterChange(event.target.value)}
          >
            <option value="all">Todos os cartões</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {availableTypeFilters.map((type) => {
            const active = typeFilters.includes(type)
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleTypeFilter(type)}
                className={`rounded-xl border px-3 py-2 text-xs transition ${
                  active
                    ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
                }`}
              >
                {type}
              </button>
            )
          })}
        </div>
      </div>
      <div ref={tableRef}>
        <Table
          searchQuery={searchQuery}
          typeFilters={typeFilters}
          cardFilterId={selectedCardId === "all" ? undefined : selectedCardId}
        />
      </div>
    </div>
  )
}
