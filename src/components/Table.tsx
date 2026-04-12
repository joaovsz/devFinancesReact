import Transactions from "./Transactions"

export const Table = () => {
  return (
    <section className="flex min-h-0 max-h-[calc(100vh-15rem)] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr_56px] border-b border-zinc-800 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-400 md:text-sm">
        <span>Descrição</span>
        <span>Tipo</span>
        <span>Valor</span>
        <span>Data</span>
        <span className="text-right">Ação</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Transactions />
      </div>
    </section>
  )
}
