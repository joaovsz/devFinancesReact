import Transactions from "./Transactions"

export const Table = () => {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="grid grid-cols-[1.8fr_1fr_1fr_56px] border-b border-zinc-800 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-400 md:text-sm">
        <span>Descrição</span>
        <span>Valor</span>
        <span>Data</span>
        <span className="text-right">Ação</span>
      </div>
      <Transactions />
    </section>
  )
}
