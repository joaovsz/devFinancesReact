import "../styles/tableStyle/table.css"
import Transactions from "./Transactions"

export const Table = () => {
  return (
    <div className="table-container">
      <div className=" tableHeader">
        <div className="cell description">Descrição</div>
        <div className="cell Value">Valor</div>
        <div className="cell Data">Data</div>
        <div className="cell remove"></div>
      </div>
      <Transactions/>
    </div>
  )
}
