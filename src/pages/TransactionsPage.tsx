import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import { Table } from "../components/Table"
import { TransactionForm } from "../components/transactions/TransactionForm"
import { DismissibleInfoCard } from "../components/ui/DismissibleInfoCard"
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
  const availableTypeFilters = ["Entrada", "Saída", "Gasto fixo", "Parcelamento", "Faturamento"]
  const selectClassName =
    "w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"

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

  return (
    <div className="flex min-h-0 flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-100">Transações</h1>
      <DismissibleInfoCard
        storageKey="info-card-transactions"
        title="Como usar Transações"
        description="Nesta tela você vê lançamentos reais e planejados no mesmo fluxo."
        items={[
          "Itens planejados possuem ação de edição para ir ao Planejamento.",
          "A tabela mostra valor, categoria, tipo e forma de pagamento."
        ]}
      />
      <TransactionForm
        categories={defaultCategories}
        cards={cards}
        existingTransactions={transactions}
        onSubmitTransaction={addTransaction}
      />
      <div className="grid gap-2">
        <input
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          type="text"
          placeholder="Buscar por descrição, categoria, pagamento..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        <div className="relative sm:max-w-xs">
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
      <Table
        searchQuery={searchQuery}
        typeFilters={typeFilters}
        cardFilterId={selectedCardId === "all" ? undefined : selectedCardId}
      />
    </div>
  )
}
