import "../styles/tableStyle/table.css"
import MinusIcon from "./icons/MinusIcon"
export const Table = () => {
  return (
    <div className="table-container">
      <div className=" tableHeader">
        <div className="cell description">Descrição</div>
        <div className="cell Value">Valor</div>
        <div className="cell Data">Data</div>
        <div className="cell remove"></div>
      </div>
      <div className="tableRow">
        <div className="cell description">Salário</div>
        <div className="cell Value">R$ 1398</div>
        <div className="cell Data">01/07/2022</div>
        <div className="cell remove">
          <button>
            <MinusIcon/>
            </button>
        </div>
        </div>
      
    </div>
  )
}
