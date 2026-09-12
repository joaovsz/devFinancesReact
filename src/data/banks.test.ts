import { describe, expect, it } from "vitest"
import { findBankPresetByIdOrName, resolveBankBranding } from "./banks"

describe("bankPresets and branding resolution", () => {
  it("resolves Azul Itaú preset by id and aliases", () => {
    const byId = findBankPresetByIdOrName("azul-itau")
    expect(byId).toBeDefined()
    expect(byId?.name).toBe("Azul Itaú")
    expect(byId?.domain).toBe("voeazul.com.br")
    expect(byId?.brandColor).toBe("#002C6C")

    const byName = findBankPresetByIdOrName(undefined, "Azul Itaú")
    expect(byName?.id).toBe("azul-itau")

    const byPlatinumName = findBankPresetByIdOrName(undefined, "Azul Platinum")
    expect(byPlatinumName?.id).toBe("azul-itau")

    const byAlias = findBankPresetByIdOrName(undefined, "TudoAzul")
    expect(byAlias?.id).toBe("azul-itau")
  })

  it("differentiates Azul Itaú from generic Itaú", () => {
    const azul = findBankPresetByIdOrName(undefined, "Azul Itaú")
    const itau = findBankPresetByIdOrName(undefined, "Itaú")

    expect(azul?.id).toBe("azul-itau")
    expect(itau?.id).toBe("itau")
    expect(azul?.domain).toBe("voeazul.com.br")
    expect(itau?.domain).toBe("itau.com.br")
  })

  it("resolves branding with logoUrl and brandColor for Azul Itaú", () => {
    const branding = resolveBankBranding({ name: "Azul Itaú" })
    expect(branding.name).toBe("Azul Itaú")
    expect(branding.brandColor).toBe("#002C6C")
    expect(branding.logoUrl).toContain("voeazul.com.br")
  })
})
