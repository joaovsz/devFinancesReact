import {configureStore} from '@reduxjs/toolkit'
import stockReducer from './transactionSlice'

export const store = configureStore({
  reducer:{
    transactions:  stockReducer
  }
})
export type RootState = ReturnType<typeof  store.getState>
