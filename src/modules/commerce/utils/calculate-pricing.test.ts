import { describe, expect, it } from "vitest"
import {
  calculateLotTotals,
  calculateMinimumPrice,
  calculateSaleResult
} from "./calculate-pricing"

describe("commerce pricing calculations", () => {
  it("calculates lot total and unit cost", () => {
    expect(
      calculateLotTotals({
        quantity: 5,
        productCostTotal: 500,
        internationalShippingTotal: 120,
        taxTotal: 100,
        packagingTotal: 25,
        otherCostsTotal: 0
      })
    ).toEqual({
      totalLotCost: 745,
      unitCost: 149
    })
  })

  it("calculates sale result, margin and markup", () => {
    const result = calculateSaleResult({
      salePrice: 300,
      quantity: 2,
      unitCost: 149,
      marketplaceFee: 60,
      shippingCost: 30,
      packagingCost: 10,
      otherCosts: 0
    })

    expect(result.grossRevenue).toBe(600)
    expect(result.productCost).toBe(298)
    expect(result.totalCost).toBe(398)
    expect(result.netProfit).toBe(202)
    expect(result.profitMargin).toBeCloseTo(33.666, 2)
    expect(result.markup).toBeCloseTo(2.013, 2)
  })

  it("calculates minimum price for a desired margin", () => {
    expect(
      calculateMinimumPrice({
        unitCost: 150,
        fixedCosts: 30,
        marketplaceFeePercent: 18,
        desiredMarginPercent: 20
      })
    ).toBeCloseTo(290.32, 2)
  })
})
