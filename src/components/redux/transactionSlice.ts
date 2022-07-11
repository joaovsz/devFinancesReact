import { createSlice } from "@reduxjs/toolkit";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { Transaction } from "../../types/transaction";

const initialState={
  reloaded: false,
  transaction: [],
  totalIncomes:0.00,
  totalExpenses:0.00,
  totalAmount: 0.00,
}

const stock = createSlice({
  name: "transactions",
  initialState,
  reducers:{
    reloadValues:(state: { reloaded: boolean; },action: any) => {
      state.reloaded = false;
    },
    
    addTransaction:(
      state:{transaction:Transaction[] } , 
      action:{type:string, payload: Transaction}
      )=>{
       
        const newTransaction :Transaction = {
          id: action.payload.id,
          label:action.payload.label,
          value:action.payload.value,
          date:action.payload.date,
          type:action.payload.type
        }
        state.transaction.push(newTransaction);
        
    },
    removeTransaction:(
      state:{transaction:Transaction[], totalAmount: number, 
              totalIncomes: number, totalExpenses:number} , 
      action:{type:any, payload: any}
      )=>{

        const stateFiltered = state.transaction.findIndex(
          (transaction: Transaction) => {transaction.id===action.payload})
          state.transaction.splice(stateFiltered, 1)

        },

    calculateIncomes:(
      state:{totalIncomes: number},
      action:{type:any, payload: number}
    )=>{
      state.totalIncomes = state.totalIncomes + action.payload
      
    },
    calculateExpenses:(
      state:{totalExpenses: number},
      action:{type:any, payload: number}
    )=>{
      state.totalExpenses = state.totalExpenses + action.payload
    },
    calculateTotal:(
      state:{totalExpenses:number, totalIncomes:number, totalAmount:number},
      )=>{
        state.totalAmount= state.totalIncomes-state.totalExpenses

    },
    minusTransaction:(state:{totalExpenses:number, totalIncomes:number, totalAmount:number},
                      action:{type:any, payload: any})=>{
                        const transaction = action.payload
             if(transaction.type===1){
              state.totalIncomes = state.totalIncomes - transaction.amount
              state.totalAmount= state.totalIncomes-state.totalExpenses

             }else{
              state.totalExpenses = state.totalExpenses - transaction.amount
              state.totalAmount= state.totalIncomes-state.totalExpenses
             }
    } 
  } 
})

export const {reloadValues, minusTransaction, addTransaction, removeTransaction,calculateIncomes,calculateExpenses,calculateTotal} = stock.actions
export default stock.reducer