import { ChangeEvent, useRef, useState } from "react"
import type { ColorTheme } from "../App"
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase"
import { pushLocalStateToSupabase } from "../services/supabase-sync"
import { useGoalStore } from "../store/useGoalStore"
import { useTransactionStore } from "../store/useTransactionStore"

const STORAGE_KEY = "devfinances-storage"

type SettingsPageProps = {
  colorTheme: ColorTheme
  onColorThemeChange: (theme: ColorTheme) => void
}

type SettingsCategory = "appearance" | "data" | "maintenance"

const colorThemeOptions: Array<{
  value: ColorTheme
  label: string
  accentClass: string
  softClass: string
  glowClass: string
}> = [
  {
    value: "indigo-calm",
    label: "Indigo Calm",
    accentClass: "bg-indigo-500",
    softClass: "bg-indigo-300",
    glowClass: "bg-indigo-900/60"
  },
  {
    value: "ocean-slate",
    label: "Ocean Slate",
    accentClass: "bg-teal-500",
    softClass: "bg-teal-300",
    glowClass: "bg-teal-900/60"
  },
  {
    value: "violet-focus",
    label: "Violet Focus",
    accentClass: "bg-violet-500",
    softClass: "bg-violet-300",
    glowClass: "bg-violet-900/60"
  },
  {
    value: "amber-graphite",
    label: "Amber Graphite",
    accentClass: "bg-amber-500",
    softClass: "bg-amber-300",
    glowClass: "bg-amber-900/60"
  }
]

export const SettingsPage = ({ colorTheme, onColorThemeChange }: SettingsPageProps) => {
  const [statusMessage, setStatusMessage] = useState("")
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("appearance")
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const canLoadMockData = import.meta.env.DEV
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
    reader.onload = async () => {
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
        if (isSupabaseConfigured) {
          const supabase = getSupabaseClient()
          const {
            data: { session }
          } = await supabase!.auth.getSession()
          if (session?.user) {
            await pushLocalStateToSupabase(session.user)
          }
        }
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
      <p className="mt-2 text-sm text-zinc-400">Ajuste aparência, dados e manutenção do app.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className={`rounded-xl border px-3 py-2 text-sm transition ${
            activeCategory === "appearance"
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
              : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          }`}
          type="button"
          onClick={() => setActiveCategory("appearance")}
        >
          Aparência
        </button>
        <button
          className={`rounded-xl border px-3 py-2 text-sm transition ${
            activeCategory === "data"
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
              : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          }`}
          type="button"
          onClick={() => setActiveCategory("data")}
        >
          Backup e dados
        </button>
        <button
          className={`rounded-xl border px-3 py-2 text-sm transition ${
            activeCategory === "maintenance"
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
              : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          }`}
          type="button"
          onClick={() => setActiveCategory("maintenance")}
        >
          Manutenção
        </button>
      </div>

      {activeCategory === "appearance" && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Estilo de cor</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {colorThemeOptions.map((themeOption) => {
              const isActive = colorTheme === themeOption.value
              return (
                <button
                  key={themeOption.value}
                  aria-pressed={isActive}
                  className={`rounded-xl border p-3 text-left transition ${
                    isActive
                      ? "border-emerald-500 bg-zinc-900 ring-2 ring-emerald-500/30"
                      : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                  }`}
                  onClick={() => onColorThemeChange(themeOption.value)}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-100">{themeOption.label}</span>
                    {isActive && (
                      <span className="rounded-md border border-emerald-500/60 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                        Ativo
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <span className={`h-7 flex-1 rounded-md ${themeOption.accentClass}`} />
                    <span className={`h-7 flex-1 rounded-md ${themeOption.softClass}`} />
                    <span className={`h-7 flex-1 rounded-md ${themeOption.glowClass}`} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {activeCategory === "data" && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Backup local</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
              onClick={exportBackup}
              type="button"
            >
              Exportar backup (.json)
            </button>
            <button
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-emerald-400"
              onClick={openImportDialog}
              type="button"
            >
              Importar backup (.json)
            </button>
          </div>
        </div>
      )}

      {activeCategory === "maintenance" && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Ferramentas de manutenção</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {canLoadMockData && (
              <button
                className="rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/25"
                onClick={fillWithMockData}
                type="button"
              >
                Carregar dados mock
              </button>
            )}
            <button
              className="rounded-xl border border-rose-500/60 bg-rose-500/15 px-4 py-2.5 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25"
              onClick={resetAllLocalData}
              type="button"
            >
              Limpar dados locais
            </button>
          </div>
        </div>
      )}

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
