export type Holiday = {
  date: string
  name: string
  type?: string
}

const HOLIDAY_CACHE_PREFIX = "devfinances-holidays-year-"

function getCacheKey(year: number) {
  return `${HOLIDAY_CACHE_PREFIX}${year}`
}

function readHolidayCache(year: number): Holiday[] | null {
  try {
    const raw = localStorage.getItem(getCacheKey(year))
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Holiday[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeHolidayCache(year: number, holidays: Holiday[]) {
  try {
    localStorage.setItem(getCacheKey(year), JSON.stringify(holidays))
  } catch {
    // cache best effort
  }
}

export async function fetchBrazilHolidaysByYear(year: number): Promise<Holiday[]> {
  const cached = readHolidayCache(year)
  if (cached) {
    return cached
  }

  const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`)
  if (!response.ok) {
    throw new Error(`Holiday API failed for year ${year}`)
  }

  const payload = (await response.json()) as Holiday[]
  const holidays = Array.isArray(payload) ? payload : []
  writeHolidayCache(year, holidays)
  return holidays
}
