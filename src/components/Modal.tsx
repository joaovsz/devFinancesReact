
export const Modal = () => {
 
  return (
    <div className="fixed inset-0 z-50 hidden items-center justify-center bg-zinc-950/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Nova transação</h2>
        <form action="" onSubmit={() => {}} className="space-y-3">
          <div>
            <label className="sr-only" htmlFor="description">Descrição</label>
            <input
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none"
              type="text"
              name="description"
              id="description"
              placeholder="Descrição"
            />
          </div>

          <div>
            <label className="sr-only" htmlFor="amount">Valor</label>
            <input
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none"
              type="number"
              step="0.01"
              name="amount"
              id="amount"
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="sr-only" htmlFor="date">Data</label>
            <input
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none"
              type="date"
              name="date"
              id="date"
              placeholder="date"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200" onClick={() => {}}>Cancelar</button>
            <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white" onClick={() => {}}>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
