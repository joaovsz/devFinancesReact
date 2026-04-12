import { Transaction } from "../types/transaction"
import MinusIcon from "./icons/MinusIcon"
import { useTransactionStore } from '../store/useTransactionStore'

export const formatCurrency = (value: number | string) => {
  const signal = Number(value) < 0 ? "-" : "";

  // Converte para número (considerando valores decimais)
  const numericValue = Number(String(value).replace(/[^\d.-]/g, ''));

  const formattedValue = numericValue.toLocaleString("pt-br", {
    style: "currency",
    currency: "BRL"
  });

  return signal + formattedValue;
};




const Transactions = () => {
  const transactions = useTransactionStore((state) => state.transactions)
  const removeTransaction = useTransactionStore((state) => state.removeTransaction)

  function removeTransactions(id:string){
    removeTransaction(id)
  }

  if (transactions.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-zinc-500">
        Nenhuma transação cadastrada.
      </div>
    )
  }

  return (
    <>
      {transactions.map((transaction: Transaction) => {
        const splittedDate = transaction.date.split('-')
        return (
          <div
            key={transaction.id}
            className="grid grid-cols-[1.8fr_1fr_1fr_56px] items-center border-b border-zinc-800/70 px-5 py-4 text-sm text-zinc-200 last:border-b-0"
          >
            <div className="truncate">{transaction.label}</div>
            <div className={transaction.type === 1 ? "text-emerald-500" : "text-rose-500"}>
              {formatCurrency(transaction.value)}
            </div>
            <div className="text-zinc-400">
              {splittedDate[2]}/{splittedDate[1]}/{splittedDate[0]}
            </div>
            <div className="flex justify-end">
              <button
                aria-label="Remover transação"
                className="rounded-lg p-1 transition hover:bg-zinc-800"
                onClick={() => { removeTransactions(transaction.id) }}
              >
                <MinusIcon />
              </button>
            </div>
          </div>
        )
      })}
    </>
  )
}

export default Transactions
