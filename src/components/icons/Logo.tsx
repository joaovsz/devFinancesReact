import type { SVGProps } from "react"

export type LogoVariant = "horizontal" | "stacked" | "symbol" | "icon" | "simple"

export type LogoProps = {
  className?: string
  variant?: LogoVariant
  size?: "sm" | "md" | "lg" | number
  showText?: boolean
  accentColor?: string
}

export const SWIFT_BRAND_ACCENT = "oklch(48% 0.13 148)"
export const SWIFT_BRAND_ACCENT_DARK = "oklch(36% 0.12 148)"
export const SWIFT_BRAND_HEX = "#13702f"
export const SWIFT_BRAND_DARK_HEX = "#004d11"

/**
 * Símbolo oficial Swift Finances:
 * Um sino de notificação — a captura do alerta bancário — com uma etiqueta de categoria ao lado.
 */
export function SwiftFinancesSymbol({
  className = "",
  size = 24,
  strokeWidth = 2,
  dotFill,
  dotStroke,
  ...props
}: SVGProps<SVGSVGElement> & {
  size?: number | string
  dotFill?: string
  dotStroke?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <circle
        cx="18.5"
        cy="5.5"
        r="3.2"
        fill={dotFill || "#10b981"}
        stroke={dotStroke || "currentColor"}
        strokeWidth="1.4"
      />
    </svg>
  )
}

/**
 * Versão simplificada (Favicon / tamanhos mínimos sem a etiqueta de categoria)
 */
export function SwiftFinancesSimpleSymbol({
  className = "",
  size = 24,
  strokeWidth = 2.4,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number | string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

/**
 * Ícone do App (quadrado com cantos arredondados na cor da marca)
 */
export function SwiftFinancesAppIcon({
  size = 40,
  className = ""
}: {
  size?: number
  className?: string
}) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl overflow-hidden shrink-0 shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: SWIFT_BRAND_HEX
      }}
      title="Swift Finances"
    >
      <SwiftFinancesSymbol
        size={Math.round(size * 0.65)}
        className="text-white"
        dotFill={SWIFT_BRAND_HEX}
        dotStroke="#ffffff"
        strokeWidth={1.8}
      />
    </div>
  )
}

/**
 * Componente principal da Logomarca Swift Finances
 */
export function Logo({
  className = "",
  variant = "horizontal",
  size = "md",
  showText = true,
  accentColor = "#10b981"
}: LogoProps) {
  if (variant === "symbol") {
    const dim = size === "sm" ? 20 : size === "lg" ? 32 : 26
    return <SwiftFinancesSymbol size={dim} className={className} dotFill={accentColor} />
  }

  if (variant === "simple") {
    const dim = size === "sm" ? 18 : size === "lg" ? 28 : 22
    return <SwiftFinancesSimpleSymbol size={dim} className={className} />
  }

  if (variant === "icon") {
    const dim = size === "sm" ? 28 : size === "lg" ? 44 : 36
    return <SwiftFinancesAppIcon size={dim} className={className} />
  }

  if (variant === "stacked") {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        <SwiftFinancesSymbol size={28} className="shrink-0 text-emerald-500" dotFill="#10b981" />
        <div className="h-7 w-[1.5px] bg-zinc-700/80 shrink-0" />
        <div className="font-['Archivo',system-ui,sans-serif] font-[800] text-xs leading-[1.05] tracking-[0.02em] uppercase">
          <div>SWIFT</div>
          <div>FINANCES</div>
        </div>
      </div>
    )
  }

  // Variant horizontal (default) - Assinatura da marca para o Header
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <SwiftFinancesSymbol
        size={26}
        className="text-emerald-400 shrink-0"
        dotFill="#10b981"
        strokeWidth={2}
      />
      {showText && (
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block h-5 w-[1.5px] bg-zinc-700/80" />
          <span className="font-['Archivo',system-ui,sans-serif] font-[800] text-sm md:text-base tracking-[0.02em] uppercase text-zinc-100">
            SWIFT <span className="text-zinc-400 font-[600]">FINANCES</span>
          </span>
        </div>
      )}
    </div>
  )
}

export default Logo
