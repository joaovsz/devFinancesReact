import "../styles/cardStyle/card.css"
import IncomeIcon from "../components/icons/IncomeIcon"
import ExpensesIcon from "./icons/ExpensesIcon"
import TotalIcon from "./icons/TotalIcon"

const cards = [
  {
    type: "Entradas",
    icon: "Income"
  },
  {
    type: "Saídas",
    icon: "Expenses"
  },
  {
    type: "Total",
    icon: "Total"
  }
]

export const Cards = () => {

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
        <span className="value">R$1568</span>
      </div>))}
    </div>
    <div className="button">
      <button id="newTransaction">Nova transação</button>
    </div>
        </>
  )
}



