import { PurchaseLot } from "../types/commerce.types"

export type CalculatePricingInput = {
  salePrice: number
  quantity: number
  unitCost: number
  marketplaceFee: number
  shippingCost: number
  packagingCost: number
  otherCosts: number
}

export function calculateLotTotals(input: {
  quantity: number
  productCostTotal: number
  internationalShippingTotal: number
  taxTotal: number
  packagingTotal: number
  otherCostsTotal: number
}) {
  const totalLotCost =
    input.productCostTotal +
    input.internationalShippingTotal +
    input.taxTotal +
    input.packagingTotal +
    input.otherCostsTotal
  const unitCost = input.quantity > 0 ? totalLotCost / input.quantity : 0

  return {
    totalLotCost,
    unitCost
  }
}

export function calculateSaleResult(input: CalculatePricingInput) {
  const grossRevenue = input.salePrice * input.quantity
  const productCost = input.unitCost * input.quantity
  const totalCost =
    productCost +
    input.marketplaceFee +
    input.shippingCost +
    input.packagingCost +
    input.otherCosts
  const netProfit = grossRevenue - totalCost
  const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0
  const markup = productCost > 0 ? grossRevenue / productCost : 0

  return {
    grossRevenue,
    productCost,
    totalCost,
    netProfit,
    profitMargin,
    markup
  }
}

export function calculateMinimumPrice(input: {
  unitCost: number
  fixedCosts: number
  marketplaceFeePercent: number
  desiredMarginPercent: number
}) {
  const denominator =
    1 - input.marketplaceFeePercent / 100 - input.desiredMarginPercent / 100
  if (denominator <= 0) {
    return 0
  }

  return (input.unitCost + input.fixedCosts) / denominator
}

export function getLotStockValue(lot: PurchaseLot) {
  return lot.remainingQuantity * lot.unitCost
}
