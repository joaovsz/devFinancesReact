import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useSearchParams } from "react-router-dom"
import { ChevronDown, Filter, Info, Search, SlidersHorizontal, Smartphone, X } from "lucide-react"
import { Table } from "../components/Table"
import { TransactionForm } from "../components/transactions/TransactionForm"
import { defaultCategories } from "../data/categories"
import { useTransactionStore } from "../store/useTransactionStore"
import { Transaction } from "../types/transaction"
import { getCreditCardUsageSummaries } from "../utils/domain/creditCards"
import { formatCurrencyFromNumber } from "../utils/currency-input"
import { sortCategoriesByTransactionUsage } from "../utils/categoryUsage"
import { isTransactionInOperationalMonth } from "../utils/domain/transactions"

export const TransactionsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const cards = useTransactionStore((state) => state.cards)
  const transactions = useTransactionStore((state) => state.transactions)
  const fixedCosts = useTransactionStore((state) => state.fixedCosts)
  const installmentPlans = useTransactionStore((state) => state.installmentPlans)
  const activeMonthKey = useTransactionStore((state) => state.activeMonthKey)
  const addTransaction = useTransactionStore((state) => state.addTransaction)
  const updateTransaction = useTransactionStore((state) => state.updateTransaction)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilters, setTypeFilters] = useState<string[]>([])
  const [selectedCardId, setSelectedCardId] = useState(searchParams.get("cardId") || "all")
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    searchParams.get("categoryId") || "all"
  )
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [isAccordionOpen, setIsAccordionOpen] = useState(
    Boolean(searchParams.get("cardId") || searchParams.get("categoryId"))
  )
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const quickAddCreditCardId =
    searchParams.get("action") === "add-expense" ? searchParams.get("cardId") || undefined : undefined
  const availableTypeFilters = ["Entrada", "Saída", "Gasto fixo", "Parcelamento", "Faturamento"]
  const selectClassName =
    "w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count += 1
    if (selectedCategoryId !== "all") count += 1
    if (selectedCardId !== "all") count += 1
    count += typeFilters.length
    return count
  }, [searchQuery, selectedCategoryId, selectedCardId, typeFilters])

  const handleClearAllFilters = () => {
    setSearchQuery("")
    handleCategoryFilterChange("all")
    handleCardFilterChange("all")
    setTypeFilters([])
  }
  const formRef = useRef<HTMLDivElement | null>(null)
  const tableRef = useRef<HTMLDivElement | null>(null)
  const showInvoiceContext = searchParams.get("source") === "invoice"

  const selectedInvoiceContext = useMemo(() => {
    if (!showInvoiceContext || selectedCardId === "all") {
      return null
    }

    const selectedCard = getCreditCardUsageSummaries({
      cards,
      transactions,
      fixedCosts,
      installmentPlans,
      monthKey: activeMonthKey
    }).find((card) => card.id === selectedCardId)

    if (!selectedCard) {
      return null
    }

    const [year, month] = activeMonthKey.split("-").map(Number)
    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric"
    })

    return {
      cardName: selectedCard.name,
      monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      invoiceValue: selectedCard.currentInvoice
    }
  }, [
    activeMonthKey,
    cards,
    fixedCosts,
    installmentPlans,
    selectedCardId,
    showInvoiceContext,
    transactions
  ])

  const pendingAndroidCount = useMemo(
    () => transactions.filter((t) => t.categoryId === "alterar").length,
    [transactions]
  )
  const operationalMonthTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        isTransactionInOperationalMonth({
          transaction,
          cards,
          monthKey: activeMonthKey
        })
      ),
    [transactions, cards, activeMonthKey]
  )
  const categoriesByUsage = useMemo(
    () => sortCategoriesByTransactionUsage(defaultCategories, operationalMonthTransactions),
    [operationalMonthTransactions]
  )

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

  function handleCategoryFilterChange(categoryId: string) {
    setSelectedCategoryId(categoryId)
    const next = new URLSearchParams(searchParams)
    if (categoryId === "all") {
      next.delete("categoryId")
    } else {
      next.set("categoryId", categoryId)
    }
    setSearchParams(next, { replace: true })
  }

  function handleEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  function handleSubmitTransaction(transaction: Transaction) {
    if (editingTransaction) {
      updateTransaction(transaction)
      return
    }

    addTransaction(transaction)
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
                  • Use busca, filtros por tipo, categoria e cartão para revisar lançamentos
                  e concentrar o total gasto em cada recorte.
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      {pendingAndroidCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3"
        >
          <div className="flex items-center gap-2 text-sm text-amber-200">
            <Smartphone size={15} className="shrink-0 text-amber-400" />
            <span>
              <span className="font-semibold">{pendingAndroidCount}</span>{" "}
              {pendingAndroidCount === 1
                ? "transação capturada pelo app Android aguarda revisão de categoria."
                : "transações capturadas pelo app Android aguardam revisão de categoria."}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("Alterar")
              tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
            className="shrink-0 rounded-lg border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/30"
          >
            Revisar agora
          </button>
        </motion.div>
      )}

      <div ref={formRef}>
        <TransactionForm
          categories={categoriesByUsage}
          cards={cards}
          initialCreditCardId={quickAddCreditCardId}
          existingTransactions={transactions}
          editingTransaction={editingTransaction}
          onSubmitTransaction={handleSubmitTransaction}
          onCancelEdit={() => setEditingTransaction(null)}
        />
      </div>
      {/* Desktop Accordion Filter Section */}
      <div className="hidden md:block w-full rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-sm transition">
        <button
          type="button"
          onClick={() => setIsAccordionOpen((prev) => !prev)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-zinc-800/40"
          aria-expanded={isAccordionOpen}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-zinc-300">
              <Filter size={15} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-200">Filtros e busca</span>
                {activeFiltersCount > 0 && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                    {activeFiltersCount} {activeFiltersCount === 1 ? "filtro ativo" : "filtros ativos"}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Filtre lançamentos por descrição, categoria, cartão ou tipo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClearAllFilters()
                }}
                className="text-xs text-zinc-400 underline transition hover:text-zinc-200"
              >
                Limpar filtros
              </button>
            )}
            <motion.div
              animate={{ rotate: isAccordionOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-zinc-400"
            >
              <ChevronDown size={18} />
            </motion.div>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isAccordionOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden border-t border-zinc-800/80 bg-zinc-950/40 p-4 sm:p-5 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Search */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Buscar descrição ou valor
                  </label>
                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-9 pr-8 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                      type="text"
                      placeholder="Descrição, valor, tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Select */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Categoria
                  </label>
                  <div className="relative">
                    <select
                      className={selectClassName}
                      value={selectedCategoryId}
                      onChange={(e) => handleCategoryFilterChange(e.target.value)}
                    >
                      <option value="all">Todas as categorias</option>
                      {categoriesByUsage.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                  </div>
                </div>

                {/* Card Select */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Cartão de crédito
                  </label>
                  <div className="relative">
                    <select
                      className={selectClassName}
                      value={selectedCardId}
                      onChange={(e) => handleCardFilterChange(e.target.value)}
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
                </div>
              </div>

              {/* Type Chips */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Tipo de lançamento
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTypeFilters.map((type) => {
                    const active = typeFilters.includes(type)
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleTypeFilter(type)}
                        className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                          active
                            ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300 font-medium"
                            : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
                        }`}
                      >
                        {type}
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Controls Trigger Bar */}
      <div className="md:hidden flex flex-col gap-2 w-full max-w-full">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="text"
              placeholder="Buscar transações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-9 pr-8 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsBottomSheetOpen(true)}
            className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium shrink-0 transition ${
              activeFiltersCount > 0
                ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-zinc-950">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick active filters badges on mobile */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {selectedCategoryId !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-300">
                {categoriesByUsage.find((c) => c.id === selectedCategoryId)?.name || selectedCategoryId}
                <button
                  type="button"
                  onClick={() => handleCategoryFilterChange("all")}
                  className="hover:text-zinc-100"
                >
                  ×
                </button>
              </span>
            )}
            {selectedCardId !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-300">
                {cards.find((c) => c.id === selectedCardId)?.name || selectedCardId}
                <button
                  type="button"
                  onClick={() => handleCardFilterChange("all")}
                  className="hover:text-zinc-100"
                >
                  ×
                </button>
              </span>
            )}
            {typeFilters.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300"
              >
                {t}
                <button
                  type="button"
                  onClick={() => toggleTypeFilter(t)}
                  className="hover:text-emerald-100"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-[11px] text-zinc-500 underline hover:text-zinc-300 ml-1"
            >
              Limpar todos
            </button>
          </div>
        )}
      </div>

      {/* Mobile BottomSheet Drawer */}
      <AnimatePresence>
        {isBottomSheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBottomSheetOpen(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
            />

            {/* Slide-up Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-zinc-800 bg-zinc-900 p-5 shadow-2xl pb-[calc(2rem+env(safe-area-inset-bottom))] md:hidden"
            >
              {/* Top Handle */}
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-700" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={17} className="text-emerald-400" />
                  <h3 className="text-base font-semibold text-zinc-100">Filtros de transação</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBottomSheetOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                  aria-label="Fechar filtros"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Sheet Controls */}
              <div className="mt-4 space-y-4">
                {/* Search */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Buscar descrição ou palavra-chave
                  </label>
                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-8 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                      type="text"
                      placeholder="Buscar por descrição..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Filtrar por categoria
                  </label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
                      value={selectedCategoryId}
                      onChange={(e) => handleCategoryFilterChange(e.target.value)}
                    >
                      <option value="all">Todas as categorias</option>
                      {categoriesByUsage.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                  </div>
                </div>

                {/* Card */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Filtrar por cartão de crédito
                  </label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
                      value={selectedCardId}
                      onChange={(e) => handleCardFilterChange(e.target.value)}
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
                </div>

                {/* Types */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Tipo de lançamento
                  </label>
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
                              ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300 font-medium"
                              : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
                          }`}
                        >
                          {type}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-6 flex items-center gap-3 pt-3 border-t border-zinc-800">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 py-3 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                  >
                    Limpar tudo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsBottomSheetOpen(false)}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400"
                >
                  Ver resultados
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {selectedInvoiceContext && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-400">
          <span>Fatura filtrada</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-300">{selectedInvoiceContext.cardName}</span>
          <span className="text-zinc-600">•</span>
          <span>{selectedInvoiceContext.monthLabel}</span>
          <span className="text-zinc-600">•</span>
          <span className="font-semibold text-amber-300">
            {formatCurrencyFromNumber(selectedInvoiceContext.invoiceValue)}
          </span>
        </div>
      )}
      <div ref={tableRef}>
        <Table
          searchQuery={searchQuery}
          typeFilters={typeFilters}
          categoryFilterId={selectedCategoryId === "all" ? undefined : selectedCategoryId}
          cardFilterId={selectedCardId === "all" ? undefined : selectedCardId}
          onEditTransaction={handleEditTransaction}
        />
      </div>
    </div>
  )
}
