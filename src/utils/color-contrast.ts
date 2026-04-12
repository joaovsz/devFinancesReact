function normalizeHexColor(hexColor: string) {
  const normalized = hexColor.replace("#", "").trim()
  if (normalized.length === 3) {
    return normalized
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
  }
  return normalized.slice(0, 6)
}

function toRgb(hexColor: string) {
  const normalized = normalizeHexColor(hexColor)
  const parsed = Number.parseInt(normalized, 16)
  if (Number.isNaN(parsed)) {
    return { r: 16, g: 24, b: 39 }
  }

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255
  }
}

function toLinear(channel: number) {
  const value = channel / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function getLuminance(hexColor: string) {
  const { r, g, b } = toRgb(hexColor)
  const red = toLinear(r)
  const green = toLinear(g)
  const blue = toLinear(b)
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function getContrastPalette(backgroundColor: string) {
  const luminance = getLuminance(backgroundColor)
  const useDarkText = luminance > 0.56

  return {
    primary: useDarkText ? "#111827" : "#F8FAFC",
    secondary: useDarkText ? "rgba(17, 24, 39, 0.84)" : "rgba(248, 250, 252, 0.9)",
    muted: useDarkText ? "rgba(17, 24, 39, 0.7)" : "rgba(248, 250, 252, 0.75)",
    track: useDarkText ? "rgba(17, 24, 39, 0.2)" : "rgba(248, 250, 252, 0.26)"
  }
}
