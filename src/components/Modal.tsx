

import "../styles/modalStyle/modal.css"


export const Modal = () => {
 
  return (
    <div className="modal-overlay active">
    <div className="modal">
            <div id="form">
                <h2>Nova transação</h2>
                <form action="" onSubmit={() => {}} >
                    <div className="input-group">
                        <label className="sr-only" htmlFor="description">Descrição</label>
                        <input type="text" name="description" id="description"
                        placeholder="Descrição"/>
                    </div>

                    <div className="input-group">
                        <label className="sr-only" htmlFor="amount">Valor</label>
                        <input type="number"
                        step="0.01" name="amount" id="amount"
                        placeholder="0,00"/>
                  
                    </div>

                    <div className="input-group">
                        <label className="sr-only" htmlFor="date"></label>
                        <input type="date" name="date" 
                        id="date"
                        placeholder="date"/>
                    </div>

                    <div className="input-group actions">
                        <button className="button" onClick={()=>{}} >Cancelar</button>
                        <button className="button" onClick={()=>{}}>Salvar</button>
                    </div>

                </form>
            </div>
       
</div>
</div>
  )
}
