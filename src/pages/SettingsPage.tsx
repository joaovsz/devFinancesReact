import { ChangeEvent, useRef, useState } from "react"

const STORAGE_KEY = "devfinances-storage"

export const SettingsPage = () => {
  const [statusMessage, setStatusMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function exportBackup() {
    const raw = localStorage.getItem(STORAGE_KEY)
    const fallback = JSON.stringify({
      state: {},
      version: 18
    })
    const payload = raw || fallback
    const now = new Date()
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`
    const blob = new Blob([payload], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `devfinances-backup-${stamp}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setStatusMessage("Backup exportado com sucesso.")
  }

  function openImportDialog() {
    fileInputRef.current?.click()
  }

  function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result || "")
        const parsed = JSON.parse(text) as { state?: unknown; version?: number } | unknown
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          !("state" in parsed) ||
          !("version" in parsed)
        ) {
          throw new Error("Estrutura inválida")
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
        setStatusMessage("Backup importado. Recarregando aplicação...")
        window.setTimeout(() => window.location.reload(), 350)
      } catch {
        setStatusMessage("Falha ao importar backup. Verifique o arquivo selecionado.")
      }
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h1 className="text-xl font-semibold text-zinc-100">Configurações</h1>
      <p className="mt-2 text-sm text-zinc-400">Gerencie backup e restauração dos dados locais.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
          onClick={exportBackup}
          type="button"
        >
          Exportar backup (.json)
        </button>
        <button
          className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400"
          onClick={openImportDialog}
          type="button"
        >
          Importar backup (.json)
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={importBackup}
      />

      {statusMessage && <p className="mt-3 text-xs text-zinc-400">{statusMessage}</p>}
    </section>
  )
}
