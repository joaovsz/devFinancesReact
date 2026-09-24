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
export const SWIFT_BRAND_HEX = "#10b981"
export const SWIFT_BRAND_DARK_HEX = "#059669"

/**
 * Símbolo oficial Swift Finances:
 * Um cifrão sólido e angular, com hastes pontiagudas e o ponto de notificação no canto superior.
 * O S facetado acompanha o peso do logotipo e remete à inicial de Swift.
 */
export function SwiftFinancesSymbol({
  className = "",
  size = 24,
  dotFill,
  dotStroke,
  showDot = true,
  ...props
}: SVGProps<SVGSVGElement> & {
  size?: number | string
  dotFill?: string
  dotStroke?: string
  showDot?: boolean
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path
        fill="currentColor"
        stroke="none"
        d="M18 5H8L6 7v4.6l2 2h6.8v2.2H7L6 19h10l2-2v-4.6l-2-2H9.2V8.2H17z"
      />
      <path
        fill="currentColor"
        stroke="none"
        d="M10.4 5V3L12 1.2 13.6 3v2zM10.4 19v2l1.6 1.8 1.6-1.8v-2z"
      />
      {showDot && (
        <circle
          cx="21"
          cy="3"
          r="2.3"
          fill={dotFill || "#059669"}
          stroke={dotStroke || "#09090b"}
          strokeWidth="1.4"
        />
      )}
    </svg>
  )
}

/**
 * Versão simplificada (Favicon / tamanhos mínimos sem o ponto de notificação)
 */
export function SwiftFinancesSimpleSymbol({
  className = "",
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number | string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path
        fill="currentColor"
        stroke="none"
        d="M18 5H8L6 7v4.6l2 2h6.8v2.2H7L6 19h10l2-2v-4.6l-2-2H9.2V8.2H17z"
      />
      <path
        fill="currentColor"
        stroke="none"
        d="M10.4 5V3L12 1.2 13.6 3v2zM10.4 19v2l1.6 1.8 1.6-1.8v-2z"
      />
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
        dotFill={SWIFT_BRAND_DARK_HEX}
        dotStroke="#ffffff"
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
        <SwiftFinancesSymbol size={28} className="shrink-0 text-emerald-400" dotFill="#059669" />
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
        size={28}
        className="text-emerald-400 shrink-0"
        dotFill="#059669"
        dotStroke="#09090b"
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
