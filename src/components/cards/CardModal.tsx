import { FormEvent, useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, Trash2, X } from "lucide-react"
import { CreditCard as CardType } from "../../types/card"
import { BankPreset, bankPresets, findBankPresetByIdOrName } from "../../data/banks"
import {
  formatCurrencyFromNumber,
  formatCurrencyInput,
  parseCurrencyInput
} from "../../utils/currency-input"

export const PRESET_BRAND_COLORS = [
  { color: "#002C6C", label: "Azul" },
  { color: "#EC7000", label: "Itaú" },
  { color: "#820AD1", label: "Nubank" },
  { color: "#FFCD00", label: "Ourocard" },
  { color: "#0033A0", label: "BB" },
  { color: "#FF7A00", label: "Inter" },
  { color: "#18181B", label: "Black" },
  { color: "#71717A", label: "Platinum" }
]

const otherBankOption: BankPreset = { id: "other", name: "Outros", brandColor: "#64748B" }

type CardModalProps = {
  isOpen: boolean
  editingCard: CardType | null
  institutions: BankPreset[]
  onClose: () => void
  onSave: (data: {
    id?: string
    bankId?: string
    name: string
    brandColor: string
    logoUrl?: string
    limitTotal: number
    closeDay: number
    dueDay: number
  }) => void
  onRemove?: (cardId: string) => void
}

export const CardModal = ({
  isOpen,
  editingCard,
  institutions,
  onClose,
  onSave,
  onRemove
}: CardModalProps) => {
  const dayOptions = useMemo(
    () => Array.from({ length: 31 }, (_, index) => String(index + 1)),
    []
  )
  const cardBankOptions = useMemo(
    () => [...institutions, otherBankOption],
    [institutions]
  )

  const [bankSearch, setBankSearch] = useState("")
  const [showBankOptions, setShowBankOptions] = useState(false)
  const [selectedBankId, setSelectedBankId] = useState("other")
  const [name, setName] = useState("")
  const [limitInput, setLimitInput] = useState("")
  const [closeDay, setCloseDay] = useState("1")
  const [dueDay, setDueDay] = useState("10")
  const [brandColor, setBrandColor] = useState("#002C6C")
  const [logoUrl, setLogoUrl] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null)
      return
    }

    if (editingCard) {
      const matchedBank =
        cardBankOptions.find((b) => b.id === editingCard.bankId) ||
        findBankPresetByIdOrName(editingCard.bankId, editingCard.name)
      setSelectedBankId(editingCard.bankId || matchedBank?.id || "other")
      setBankSearch(matchedBank?.name || editingCard.name || "")
      setName(editingCard.name)
      setLimitInput(formatCurrencyFromNumber(editingCard.limitTotal))
      setCloseDay(String(editingCard.closeDay || 1))
      setDueDay(String(editingCard.dueDay || 10))
      setBrandColor(editingCard.brandColor || matchedBank?.brandColor || "#002C6C")
      setLogoUrl(editingCard.logoUrl || matchedBank?.logoUrl || "")
      setErrorMessage(null)
    } else {
      const initialBank = bankPresets[0] || cardBankOptions[0]
      setSelectedBankId(initialBank?.id || "other")
      setBankSearch(initialBank?.name || "")
      setName(initialBank?.name || "")
      setLimitInput("")
      setCloseDay("1")
      setDueDay("10")
      setBrandColor(initialBank?.brandColor || "#002C6C")
      setLogoUrl(initialBank?.logoUrl || "")
      setErrorMessage(null)
    }
  }, [isOpen, editingCard, cardBankOptions])

  const filteredBankOptions = useMemo(() => {
    const term = bankSearch.trim().toLowerCase()
    if (!term) return cardBankOptions
    return cardBankOptions.filter((bank) =>
      bank.name.toLowerCase().includes(term)
    )
  }, [cardBankOptions, bankSearch])

  if (!isOpen) {
    return null
  }

  const handleSelectBank = (bank: BankPreset) => {
    setSelectedBankId(bank.id)
    setBankSearch(bank.name)
    setName(bank.name)
    setBrandColor(bank.brandColor)
    setLogoUrl(bank.logoUrl || "")
    setShowBankOptions(false)
  }

  const handleNameChange = (newName: string) => {
    setName(newName)
    const preset = findBankPresetByIdOrName(undefined, newName)
    if (preset) {
      setSelectedBankId(preset.id)
      if (preset.logoUrl) {
        setLogoUrl(preset.logoUrl)
      }
      if (preset.brandColor) {
        setBrandColor(preset.brandColor)
      }
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)

    const cleanName = name.trim()
    if (!cleanName) {
      setErrorMessage("Informe o nome do cartão.")
      return
    }

    const numericLimit = parseCurrencyInput(limitInput)
    if (numericLimit <= 0) {
      setErrorMessage("Informe um limite maior que zero.")
      return
    }

    const numericCloseDay = Number(closeDay)
    const numericDueDay = Number(dueDay)
    if (
      !Number.isInteger(numericCloseDay) ||
      numericCloseDay < 1 ||
      numericCloseDay > 31
    ) {
      setErrorMessage("Dia de fechamento inválido.")
      return
    }
    if (!Number.isInteger(numericDueDay) || numericDueDay < 1 || numericDueDay > 31) {
      setErrorMessage("Dia de vencimento inválido.")
      return
    }

    onSave({
      id: editingCard?.id,
      bankId: selectedBankId,
      name: cleanName,
      brandColor: brandColor || "#002C6C",
      logoUrl: logoUrl.trim() || undefined,
      limitTotal: numericLimit,
      closeDay: numericCloseDay,
      dueDay: numericDueDay
    })

    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={name}
                className="h-7 w-7 rounded-full bg-white object-contain p-0.5 shadow-sm"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none"
                }}
              />
            ) : (
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: brandColor }}
              />
            )}
            <h2 className="text-base font-semibold text-zinc-100">
              {editingCard ? "Editar cartão" : "Adicionar cartão"}
            </h2>
          </div>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            onClick={onClose}
            type="button"
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          {/* Pesquisar banco */}
          <div className="relative">
            <label className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-400">
              Pesquisar banco
            </label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 pr-8 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                type="text"
                placeholder="Pesquisar banco"
                value={bankSearch}
                onFocus={() => setShowBankOptions(true)}
                onChange={(event) => {
                  setBankSearch(event.target.value)
                  setShowBankOptions(true)
                }}
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"
                type="button"
                onClick={() => setShowBankOptions((current) => !current)}
              >
                <ChevronDown size={14} />
              </button>
            </div>
            {showBankOptions && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-2xl">
                {filteredBankOptions.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-zinc-500">
                    Nenhum banco encontrado
                  </div>
                )}
                {filteredBankOptions.map((bank) => (
                  <button
                    key={bank.id}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-200 transition hover:bg-zinc-800"
                    type="button"
                    onClick={() => handleSelectBank(bank)}
                  >
                    {bank.logoUrl ? (
                      <img
                        src={bank.logoUrl}
                        alt={bank.name}
                        className="h-4 w-4 rounded-full bg-white object-contain p-0.5"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none"
                        }}
                      />
                    ) : (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: bank.brandColor }}
                      />
                    )}
                    <span>{bank.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nome do cartão */}
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-400">
              Nome do cartão
            </label>
            <input
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              type="text"
              placeholder="Ex: Azul Itaú, Itaú Platinum, Nubank"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
            />
          </div>

          {/* Limite total */}
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-400">
              Limite total
            </label>
            <input
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              type="text"
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={limitInput}
              onChange={(event) =>
                setLimitInput(formatCurrencyInput(event.target.value))
              }
            />
          </div>

          {/* Fechamento e Vencimento */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-400">
                Dia de fechamento
              </label>
              <select
                className="h-10 max-h-10 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                value={closeDay}
                onChange={(event) => setCloseDay(event.target.value)}
              >
                {dayOptions.map((day) => (
                  <option key={`modal-close-${day}`} value={day}>
                    Dia {day}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-400">
                Dia de vencimento
              </label>
              <select
                className="h-10 max-h-10 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                value={dueDay}
                onChange={(event) => setDueDay(event.target.value)}
              >
                {dayOptions.map((day) => (
                  <option key={`modal-due-${day}`} value={day}>
                    Dia {day}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cor da marca e URL do Logo */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-400">
                Cor da marca
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  className="h-10 w-10 shrink-0 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950 p-0.5"
                  value={
                    brandColor.startsWith("#") && brandColor.length === 7
                      ? brandColor
                      : "#002C6C"
                  }
                  onChange={(event) => setBrandColor(event.target.value)}
                />
                <div className="flex flex-wrap gap-1">
                  {PRESET_BRAND_COLORS.slice(0, 4).map((presetColor) => (
                    <button
                      key={`modal-chip-${presetColor.color}`}
                      type="button"
                      title={presetColor.label}
                      className="h-5 w-5 rounded-full border border-white/20 transition hover:scale-110"
                      style={{ backgroundColor: presetColor.color }}
                      onClick={() => setBrandColor(presetColor.color)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-400">
                URL do Logo (opcional)
              </label>
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                type="text"
                placeholder="https://... (ou vazio para o padrão)"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
              />
            </div>
          </div>

          {errorMessage && (
            <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {errorMessage}
            </p>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {editingCard && onRemove && (
                <button
                  type="button"
                  onClick={() => {
                    onRemove(editingCard.id)
                    onClose()
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-500/60 bg-rose-500/15 px-3 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/25"
                >
                  <Trash2 size={13} />
                  Excluir cartão
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-400"
              >
                <Check size={14} />
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
