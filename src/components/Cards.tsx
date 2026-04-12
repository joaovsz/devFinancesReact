import IncomeIcon from "../components/icons/IncomeIcon"
import ExpensesIcon from "./icons/ExpensesIcon"
import TotalIcon from "./icons/TotalIcon"
import { MouseEvent, SetStateAction, useRef, useState } from "react"
import { v4 as uuid } from 'uuid'
import { Transaction } from "../types/transaction"
import { formatCurrency } from "./Transactions"
import { useTransactionStore } from "../store/useTransactionStore"


export const initialState = {
  label: "",
  value: "",
  date: "",
  option: 1
}


export const Cards = () => {
  const [label, setLabel] = useState(initialState.label)
  const [value, setValue] = useState(initialState.value)
  const [date, setDate] = useState(initialState.date)
  const [option, setOption] = useState(initialState.option)
  const addTransaction = useTransactionStore((state) => state.addTransaction)
  const inputRef: any = useRef()

  function clickFocus() {
    inputRef.current.focus()
  }

  const incomes = useTransactionStore((state) => state.totalIncomes)
  const expenses = useTransactionStore((state) => state.totalExpenses)
  const total = useTransactionStore((state) => state.totalAmount)


  const cards = [
    {
      type: "Entradas",
      icon: "Income",
      value: formatCurrency(incomes),
      valueColor: "text-emerald-500"
    },
    {
      type: "Saídas",
      icon: "Expenses",
      value: formatCurrency(expenses),
      valueColor: "text-rose-500"
    },
    {
      type: "Total",
      icon: "Total",
      value: formatCurrency(total),
      valueColor: "text-zinc-100"
    }
  ]


  function handleLabel(event: { target: { value: string } }) {
    let labeltext = event.target.value
    setLabel(labeltext)
  }

  function handleValue(event: { target: { value: string } }) {
    let numberValue = event.target.value
    setValue(numberValue)
  }

  function handleDate(event: { target: { value: string } }) {
    let valueDate = event.target.value
    setDate(valueDate)
  }

  function selectTransaction(event: { target: { value: SetStateAction<string> } }) {
    setOption(Number(event.target.value))
  }

  function resetValues() {
    setLabel(initialState.label)
    setValue(initialState.value)
    setDate(initialState.date)
    setOption(initialState.option)

  }


  function setData(e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) {
    e.preventDefault()
    if (label === '' || value === '' || date === '') {
      alert('Preencha todos os campos corretamente')
    } else {
      const transaction: Transaction = {
        id: uuid(),
        label: label,
        value: Number(value),
        date: date.toString(),
        type: option
      }
      addTransaction(transaction)
      resetValues()
    }

  }
  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map(card => (
          <div
            key={card.type}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg shadow-zinc-950/20"
          >
            <div className="mb-4 flex items-center justify-between text-sm text-zinc-300">
              <span>{card.type}</span>
              {card.icon === "Income" ? (<IncomeIcon />)
                : card.icon === "Expenses"
                  ? (<ExpensesIcon />)
                  : (<TotalIcon />)}
            </div>
            <span className={`text-2xl font-semibold ${card.valueColor}`}>
              {card.value}
            </span>
          </div>))}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <form className="grid gap-3 md:grid-cols-[1.8fr_1fr_1fr_1fr_auto] md:items-end">
          <div>
            <label className="sr-only" htmlFor="description">Descrição</label>
            <input
              ref={inputRef}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              type="text"
              name="description"
              id="description"
              placeholder="Descrição"
              value={label}
              onChange={handleLabel}
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="amount">Valor</label>
            <input
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              type="number"
              step="0.01"
              name="amount"
              id="amount"
              placeholder="0,00"
              value={value}
              onChange={handleValue}
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="date">Data</label>
            <input
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              type="date"
              name="date"
              id="date"
              value={date}
              onChange={handleDate}
              placeholder="date"
            />
          </div>
          <div>
            <select
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              value={option}
              onChange={(e) => selectTransaction(e)}
            >
              <option value={1}>Ganhos</option>
              <option value={2}>Despesas</option>
            </select>
          </div>
          <button
            className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400"
            id="newTransaction"
            onClick={(e) => { setData(e); clickFocus() }}
          >
            Nova transação
          </button>
        </form>
      </section>
    </>
  )
}

