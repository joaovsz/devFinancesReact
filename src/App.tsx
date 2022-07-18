import { Cards } from "./components/Cards"
import { Footer } from "./components/Footer"
import { Header } from "./components/Header"
import { Modal } from "./components/Modal"
import { Table } from "./components/Table"

function App() {
  localStorage.setItem("nome", "transaction")
  localStorage.getItem("nome ")
  return <div>
    <Header />
    <Cards />
    <Table />
    <Footer />
  </div>


}

export default App
