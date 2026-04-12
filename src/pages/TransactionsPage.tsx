import { Table } from "../components/Table"

export const TransactionsPage = () => {
  return (
    <div className="flex min-h-0 flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-100">Transações</h1>
      <Table />
    </div>
  )
}
