import { ChangeEvent, useRef, useState } from "react"
import type { ColorTheme } from "../App"
import { useGoalStore } from "../store/useGoalStore"
import { useTransactionStore } from "../store/useTransactionStore"

const STORAGE_KEY = "devfinances-storage"

type SettingsPageProps = {
  colorTheme: ColorTheme
  onColorThemeChange: (theme: ColorTheme) => void
}

export const SettingsPage = ({ colorTheme, onColorThemeChange }: SettingsPageProps) => {
  const [statusMessage, setStatusMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const loadMockData = useTransactionStore((state) => state.loadMockData)
  const clearAllData = useTransactionStore((state) => state.clearAllData)
  const loadMockGoals = useGoalStore((state) => state.loadMockGoals)
  const clearGoals = useGoalStore((state) => state.clearGoals)

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
        window.setTimeout(() => window.location.assign("/"), 350)
      } catch {
        setStatusMessage("Falha ao importar backup. Verifique o arquivo selecionado.")
      }
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  function fillWithMockData() {
    loadMockData()
    loadMockGoals()
    setStatusMessage("Dados mock carregados para testar todos os cards.")
  }

  function resetAllLocalData() {
    const confirmed = window.confirm(
      "Limpar todos os dados locais e voltar para o estado vazio?"
    )
    if (!confirmed) {
      return
    }

    clearAllData()
    clearGoals()
    setStatusMessage("Dados locais limpos com sucesso.")
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h1 className="text-xl font-semibold text-zinc-100">Configurações</h1>
      <p className="mt-2 text-sm text-zinc-400">Gerencie backup e restauração dos dados locais.</p>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <label className="grid gap-1 text-xs uppercase tracking-wide text-zinc-400">
          Estilo de cor
          <select
            className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            value={colorTheme}
            onChange={(event) => onColorThemeChange(event.target.value as ColorTheme)}
          >
            <option value="indigo-calm">Indigo Calm</option>
            <option value="ocean-slate">Ocean Slate</option>
            <option value="violet-focus">Violet Focus</option>
            <option value="amber-graphite">Amber Graphite</option>
          </select>
        </label>
      </div>

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

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <button
          className="rounded-xl border border-indigo-500/60 bg-indigo-500/15 px-4 py-2.5 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/25"
          onClick={fillWithMockData}
          type="button"
        >
          Carregar dados mock
        </button>
        <button
          className="rounded-xl border border-rose-500/60 bg-rose-500/15 px-4 py-2.5 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25"
          onClick={resetAllLocalData}
          type="button"
        >
          Limpar dados locais
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
