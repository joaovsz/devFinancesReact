import Transactions from "./Transactions"

export const Table = () => {
  return (
    <section className="flex min-h-0 max-h-[calc(100vh-15rem)] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid min-w-[720px] grid-cols-[240px_140px_130px_130px_56px] border-b border-zinc-800 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-400 md:min-w-0 md:grid-cols-[1.8fr_1fr_1fr_1fr_56px] md:text-sm">
          <span>Descrição</span>
          <span>Valor</span>
          <span>Tipo</span>
          <span>Data</span>
          <span className="text-right">Ação</span>
        </div>
        <Transactions />
      </div>
    </section>
  )
}
