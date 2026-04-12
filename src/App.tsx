import { Cards } from "./components/Cards"
import { Footer } from "./components/Footer"
import { Header } from "./components/Header"
import { Table } from "./components/Table"

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-8 md:px-8">
        <Cards />
        <Table />
      </main>
      <Footer />
    </div>
  )


}

export default App
