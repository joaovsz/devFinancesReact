import {configureStore} from '@reduxjs/toolkit'
import {persistStore, persistReducer} from 'redux-persist'
import stockReducer from './transactionSlice'
import storage from 'redux-persist/lib/storage'

const persistConfig = {
  key:'root',
  storage,
}

const persistedReducer = persistReducer(persistConfig, stockReducer)

const store = configureStore({
  reducer:{
    transactions:  persistedReducer
  }
})
const persistor = persistStore(store)

export  {store, persistor}

export type RootState = ReturnType<typeof  store.getState>
