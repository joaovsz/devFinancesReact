import { useState } from "react"
import { X } from "lucide-react"

type DismissibleInfoCardProps = {
  storageKey: string
  title: string
  description: string
  items?: string[]
}

export const DismissibleInfoCard = ({
  storageKey,
  title,
  description,
  items = []
}: DismissibleInfoCardProps) => {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") {
      return true
    }
    return localStorage.getItem(storageKey) !== "1"
  })

  function dismissCard() {
    setVisible(false)
    localStorage.setItem(storageKey, "1")
  }

  if (!visible) {
    return null
  }

  return (
    <div className="mb-3 rounded-xl border border-zinc-700/80 bg-zinc-950/70 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <p className="mt-1 text-xs text-zinc-400">{description}</p>
          {items.length > 0 && (
            <ul className="mt-2 space-y-1">
              {items.map((item) => (
                <li key={item} className="text-xs text-zinc-400">
                  • {item}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:text-zinc-100"
          onClick={dismissCard}
          title="Ocultar aviso"
          aria-label="Ocultar aviso"
          type="button"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
