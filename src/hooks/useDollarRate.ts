import { useEffect, useState } from "react"

export type DollarRateState = {
  rate: number | null
  loading: boolean
  error: string | null
  lastUpdated: string | null
}

const STORAGE_KEY = "devfinances-dollar-rate-cache"
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

type RateCache = { rate: number; fetchedAt: string }

function loadCache(): RateCache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const cached: RateCache = JSON.parse(raw)
    const ageMs = Date.now() - new Date(cached.fetchedAt).getTime()
    return ageMs < CACHE_TTL_MS ? cached : null
  } catch {
    return null
  }
}

function saveCache(rate: number) {
  const fetchedAt = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ rate, fetchedAt }))
  return fetchedAt
}

export function useDollarRate() {
  const [state, setState] = useState<DollarRateState>(() => {
    const cached = loadCache()
    return {
      rate: cached?.rate ?? null,
      loading: cached === null,
      error: null,
      lastUpdated: cached?.fetchedAt ?? null
    }
  })

  async function fetchRate() {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL")
      if (!res.ok) throw new Error("HTTP " + res.status)
      const data = await res.json()
      const rate = parseFloat(data.USDBRL.bid)
      if (!isFinite(rate) || rate <= 0) throw new Error("Cotação inválida")
      const fetchedAt = saveCache(rate)
      setState({ rate, loading: false, error: null, lastUpdated: fetchedAt })
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        error: "Não foi possível buscar a cotação. Insira manualmente."
      }))
    }
  }

  useEffect(() => {
    if (loadCache() === null) {
      fetchRate()
    }
  }, [])

  return { ...state, refetch: fetchRate }
}
