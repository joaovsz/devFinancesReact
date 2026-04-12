import { Table } from "../components/Table"
import { DismissibleInfoCard } from "../components/ui/DismissibleInfoCard"

export const TransactionsPage = () => {
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
      <Table />
    </div>
  )
}
