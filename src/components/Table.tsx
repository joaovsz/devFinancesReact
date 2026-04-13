import Transactions from "./Transactions"

export const Table = () => {
  return (
    <section className="flex min-h-0 max-h-[calc(100vh-15rem)] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="overflow-x-auto border-b border-zinc-800">
        <div className="grid min-w-[720px] grid-cols-[240px_140px_130px_130px_56px] px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-400 md:min-w-0 md:grid-cols-[1.8fr_1fr_1fr_1fr_56px] md:text-sm">
          <span className="sticky left-0 z-20 bg-zinc-900">Descrição</span>
          <span className="sticky left-[240px] z-20 bg-zinc-900">Valor</span>
          <span>Tipo</span>
          <span>Data</span>
          <span className="text-right">Ação</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Transactions />
      </div>
    </section>
  )
}
