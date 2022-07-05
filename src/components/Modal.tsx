
import { MouseEvent, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import "../styles/modalStyle/modal.css"
import { v4 as uuid } from 'uuid'
import { closeModal, addTransaction } from "./redux/transactionSlice"

const initialState = {
    isOpen: false,
    label: "",
    value: 0,
    date: "",
}

export const Modal = () => {
    const [isOpen, setIsOpenModal] = useState(initialState.isOpen)
    const [label, setLabel] = useState(initialState.label)
    const [value, setValue] = useState(initialState.value)
    const [date, setDate] = useState(initialState.date)

    const dispatch = useDispatch()

    function setCloseModal(e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) {
        e.preventDefault()
        isOpen ? dispatch(closeModal(false)) : dispatch(closeModal(true))
    }

    function handleLabel(event: { target: { value: string } }) {
        let labeltext = event.target.value
        setLabel(labeltext)
    }
    function handleValue(event: { target: { value: string } }) {
        let numberValue = event.target.value
        setValue(Number(numberValue))
    }
    function handleDate(event: { target: { value: string } }) {
        let valueDate = event.target.value
        setDate(valueDate)
    }

    function setData(e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) {
        e.preventDefault()

        if (label === '' || value === null || 0 || date === "") {
            alert('Preencha todos os campos corretamente')
        } else {
            const transaction = {
                id: uuid(),
                label: label,
                value: value,
                date: date.toString()
            }
            dispatch(addTransaction(transaction))
            dispatch(closeModal(isOpen))
        }

    }
    return (
        <div className="modal-overlay active">
            <div className="modal">

                <div id="form">
                    <h2>Nova transação</h2>
                    <form >
                        <div className="input-group">
                            <label className="sr-only" htmlFor="description">Descrição</label>
                            <input type="text" name="description" id="description"
                                placeholder="Descrição" onChange={handleLabel} />
                        </div>

                        <div className="input-group">
                            <label className="sr-only" htmlFor="amount" >Valor</label>
                            <input
                                type="number"
                                step="0.01" name="amount" id="amount"
                                placeholder="0,00" onChange={handleValue} />
                            <small className="help">Use o sinal - (negativo) para despesas e '.' (ponto) para casas decimais</small>
                        </div>

                        <div className="input-group">
                            <label className="sr-only" htmlFor="date"></label>
                            <input type="date" name="date"
                                id="date"
                                onChange={handleDate}
                                placeholder="date"></input>
                        </div>

                        <div className="input-group actions">
                            <button className="modalButton" onClick={(e) => setCloseModal(e)}>Cancelar</button>
                            <button className="modalButton" onClick={(e) => setData(e)}>Salvar</button>
                        </div>

                    </form>
                </div>

            </div>
        </div>
    )
}
