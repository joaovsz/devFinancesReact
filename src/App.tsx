import {useSelector } from "react-redux"
import { Cards } from "./components/Cards"
import { Footer } from "./components/Footer"
import { Header } from "./components/Header"
import { Modal } from "./components/Modal"
import { Table } from "./components/Table"

function App() {
  const {isOpen} = useSelector((store:any) => store.transactions);

  return <div>
    <Header />
    <Cards />
    {isOpen &&<Modal/>}
    <Table />
    <Footer />
  </div>


}

export default App
