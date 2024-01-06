import { useDispatch, useSelector } from 'react-redux'
import { Transaction } from "../types/transaction"
import MinusIcon from "./icons/MinusIcon"
import { minusTransaction, removeTransaction } from './redux/transaction-slice'

export const formatCurrency = (value: number | string) => {
  const signal = Number(value) < 0 ? "-" : "";

  // Regex para remover strings não numericas
  const numericValue = String(value).replace(/\D/g, "");

  const formattedValue = (Number(numericValue) / 100).toLocaleString("pt-br", {
    style: "currency",
    currency: "BRL"
  });

  return signal + formattedValue;
};



const Transactions = () => {
  const transactions = useSelector((store:any)=>store.transactions.transaction)
  const dispatch = useDispatch()

  function removeTransactions(id:string, type:number, amount:number){
    dispatch(removeTransaction(id))
    const forRemove = {
      type: type,
      amount: amount
    }
    dispatch(minusTransaction(forRemove))
  }

  return (<>
    {transactions.map((transaction: Transaction) =>{
      const splittedDate = transaction.date.split('-')
      return (
    <div key={transaction.id} className="tableRow">
    <div className="cell description">{transaction.label}</div>
    <div className={transaction.type===1?"cell Value":"cell Value red"}>{formatCurrency(transaction.value)}</div>
    <div className="cell Data">{splittedDate[2]}/{splittedDate[1]}/{splittedDate[0]}</div>
    <div className="cell remove">
      <button onClick={()=>{removeTransactions(transaction.id, transaction.type, transaction.value)}}>
        <MinusIcon/>
        </button>
    </div>
    </div>
  )
})}
</>
  )
}

export default Transactions

