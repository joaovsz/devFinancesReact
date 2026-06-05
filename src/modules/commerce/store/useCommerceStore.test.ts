import { beforeEach, describe, expect, it } from "vitest"
import { useCommerceStore } from "./useCommerceStore"

describe("commerce store", () => {
  beforeEach(() => {
    useCommerceStore.setState({
      products: [],
      purchaseLots: [],
      sales: [],
      stockMovements: []
    })
  })

  it("prevents duplicate SKUs", () => {
    const first = useCommerceStore.getState().addProduct({
      name: "Ajazz AK820",
      brand: "Ajazz",
      model: "AK820",
      sku: "AK820",
      category: "Teclados",
      supplierUrl: null,
      imageUrl: null,
      notes: null,
      isActive: true
    })
    const duplicated = useCommerceStore.getState().addProduct({
      name: "Ajazz AK820 Pro",
      brand: "Ajazz",
      model: "AK820 Pro",
      sku: " ak820 ",
      category: "Teclados",
      supplierUrl: null,
      imageUrl: null,
      notes: null,
      isActive: true
    })

    expect(first.ok).toBe(true)
    expect(duplicated.ok).toBe(false)
    expect(useCommerceStore.getState().products).toHaveLength(1)
  })

  it("creates purchase lot with stock movement and sells without exceeding stock", () => {
    useCommerceStore.getState().addProduct({
      name: "Ajazz AK820",
      brand: "Ajazz",
      model: "AK820",
      sku: "AK820",
      category: "Teclados",
      supplierUrl: null,
      imageUrl: null,
      notes: null,
      isActive: true
    })
    const product = useCommerceStore.getState().products[0]

    useCommerceStore.getState().addPurchaseLot({
      productId: product.id,
      quantity: 5,
      productCostTotal: 500,
      internationalShippingTotal: 120,
      taxTotal: 100,
      packagingTotal: 25,
      otherCostsTotal: 0,
      dollarRate: null,
      supplierName: "Alibaba",
      supplierOrderCode: "A1",
      purchasedAt: "2026-05-14"
    })

    const lot = useCommerceStore.getState().purchaseLots[0]
    expect(lot.remainingQuantity).toBe(5)
    expect(lot.unitCost).toBe(149)
    expect(useCommerceStore.getState().stockMovements[0]?.type).toBe("purchase")

    const sale = useCommerceStore.getState().addSale({
      productId: product.id,
      purchaseLotId: lot.id,
      marketplace: "mercado_livre",
      quantity: 2,
      salePrice: 300,
      marketplaceFee: 60,
      shippingCost: 30,
      packagingCost: 10,
      otherCosts: 0,
      soldAt: "2026-05-14",
      notes: null
    })
    const oversell = useCommerceStore.getState().addSale({
      productId: product.id,
      purchaseLotId: lot.id,
      marketplace: "mercado_livre",
      quantity: 4,
      salePrice: 300,
      marketplaceFee: 60,
      shippingCost: 30,
      packagingCost: 10,
      otherCosts: 0,
      soldAt: "2026-05-14",
      notes: null
    })

    expect(sale.ok).toBe(true)
    expect(oversell.ok).toBe(false)
    expect(useCommerceStore.getState().purchaseLots[0]?.remainingQuantity).toBe(3)
    expect(useCommerceStore.getState().sales[0]?.netProfit).toBe(202)
    expect(useCommerceStore.getState().stockMovements.at(-1)?.type).toBe("sale")
  })
})
