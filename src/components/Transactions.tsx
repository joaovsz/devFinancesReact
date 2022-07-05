import { useDispatch, useSelector } from 'react-redux'
import { Transaction } from "../types/transaction"
import MinusIcon from "./icons/MinusIcon"
import { removeTransaction } from './redux/transactionSlice'



const Transactions = () => {
  const transactions = useSelector((store:any)=>store.transactions.transaction)
  const dispatch = useDispatch()

  return (<>
    {transactions.map((transaction: Transaction) =>{
      return (
    <div key={transaction.id} className="tableRow">
    <div className="cell description">{transaction.label}</div>
    <div className="cell Value">R${transaction.value}</div>
    <div className="cell Data">{transaction.date}</div>
    <div className="cell remove">
      <button onClick={()=>{dispatch(removeTransaction(transaction.id))}}>
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

