import { createSlice } from "@reduxjs/toolkit";
import { Transaction } from "../../types/transaction";

const initialState={
  isOpen: false,
  transaction: [],
}

const stock = createSlice({
  name: "transactions",
  initialState,
  reducers:{
    openModal:(state: { isOpen: boolean; },action: any) => {
      state.isOpen = true;
    },
    closeModal:(state: { isOpen: boolean; },action: any) => {
      state.isOpen = false;
    },
    addTransaction:(
      state:{transaction:Transaction[] } , 
      action:{type:string, payload: Transaction}
      )=>{
        const newTransaction :Transaction = {
          id: action.payload.id,
          label:action.payload.label,
          value:action.payload.value,
          date:action.payload.date
        }
        state.transaction.push(newTransaction);
    },
    removeTransaction:(
      state:{transaction:Transaction[] } , 
      action:{type:any, payload: String}
      )=>{
        //  state.transaction.filter(transaction => transaction.id !== action.payload )
        const stateFiltered = state.transaction.findIndex((transaction: Transaction) => transaction.id===action.payload)
        state.transaction.splice(stateFiltered, 1)
    }
  } 
})

export const {openModal, closeModal, addTransaction, removeTransaction} = stock.actions
export default stock.reducer