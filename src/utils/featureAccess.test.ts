import { describe, expect, it } from "vitest"
import { canAccessCommerceModule, COMMERCE_MODULE_OWNER_EMAIL } from "./featureAccess"

describe("feature access", () => {
  it("allows the commerce module for local development", () => {
    expect(canAccessCommerceModule(null)).toBe(true)
    expect(canAccessCommerceModule("outra-conta@gmail.com")).toBe(true)
  })

  it("keeps the owner email configured for production access", () => {
    expect(canAccessCommerceModule(COMMERCE_MODULE_OWNER_EMAIL)).toBe(true)
    expect(canAccessCommerceModule("  JOaoVitor1713Coin@gmail.com ")).toBe(true)
  })
})
