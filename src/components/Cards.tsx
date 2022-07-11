import "../styles/cardStyle/card.css"
import IncomeIcon from "../components/icons/IncomeIcon"
import ExpensesIcon from "./icons/ExpensesIcon"
import TotalIcon from "./icons/TotalIcon"
import { useDispatch, useSelector } from "react-redux"
import { MouseEvent, SetStateAction, useEffect, useState } from "react"
import { v4 as uuid } from 'uuid'
import { addTransaction, calculateExpenses, calculateIncomes, calculateTotal, reloadValues } from "./redux/transactionSlice"
import { Transaction } from "../types/transaction"


const initialState = {
  isOpen: false,
  label: "",
  value: "",
  date: "",
  option: 1
}


export const Cards = () => {
  const [isOpen, setIsOpenModal] = useState<Boolean>(false)
  const [label, setLabel] = useState(initialState.label)
  const [value, setValue] = useState(initialState.value)
  const [date, setDate] = useState(initialState.date)
  const [option, setOption] = useState(initialState.option)

  const dispatch = useDispatch()
  const incomes = useSelector((store:any)=> store.transactions.totalIncomes)
  const expenses = useSelector((store:any)=> store.transactions.totalExpenses)
  const total = useSelector((store:any)=> store.transactions.totalAmount)

  const cards = [
    {
      type: "Entradas",
      icon: "Income",
      value: incomes
    },
    {
      type: "Saídas",
      icon: "Expenses",
      value: expenses
    },
    {
      type: "Total",
      icon: "Total",
      value: total
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
      dispatch(addTransaction(transaction))
      option===1?dispatch(calculateIncomes(transaction.value)):dispatch(calculateExpenses(transaction.value))
      dispatch(reloadValues(isOpen))
      dispatch(calculateTotal())
      setLabel(initialState.label)
      setValue(initialState.value)
      setDate(initialState.date)
      setOption(initialState.option)
    }

}
  return (
    <>
    <div className="card-container">
      {cards.map(card => (
        <div key={card.type} className="card">
        <div className="card-type">
        <span>{card.type}</span>
        {card.icon==="Income"?(<IncomeIcon/>)
        :card.icon==="Expenses"
        ?(<ExpensesIcon/>)
        :(<TotalIcon/>)}
        </div>
        <span className="value">R$ 
        {card.value}
        </span>   
      </div>))}
    </div>
    <div className="inputs">
      <form>
      <select 
      value={option}
      onChange={(e)=>selectTransaction(e)}
      >
        <option value={1}>Ganhos</option>
        <option value={2}>Despesas</option>
      </select>
      <div className="input-group">
                            <label className="sr-only" htmlFor="description">Descrição</label>
                            <input type="text" name="description" id="description"
                                placeholder="Descrição" value={label} onChange={handleLabel} />
                        </div>
                <div className="input-group">
                            <label className="sr-only" htmlFor="amount" >Valor</label>
                            <input
                                type="number"
                                step="0.01" name="amount" id="amount"
                                placeholder="0,00" value={value} onChange={handleValue} />
                            
            </div>
            <div className="input-group">
                            <label className="sr-only" htmlFor="date"></label>
                            <input type="date" name="date"
                                id="date"
                                value={date}
                                onChange={handleDate}
                                placeholder="date"></input>
                        </div>  
      <button id="newTransaction"  onClick={(e)=>setData(e)}>Nova transação</button>
      </form>
    </div>
        </>
  )
}



