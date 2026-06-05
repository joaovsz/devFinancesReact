import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { Product, PurchaseLot, Sale, StockMovement, StockMovementType } from "../types/commerce.types"
import { calculateLotTotals, calculateSaleResult } from "../utils/calculate-pricing"

type CommerceStore = {
  products: Product[]
  purchaseLots: PurchaseLot[]
  sales: Sale[]
  stockMovements: StockMovement[]
  addProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => { ok: boolean; error?: string }
  updateProduct: (product: Product) => { ok: boolean; error?: string }
  deactivateProduct: (id: string) => void
  addPurchaseLot: (lot: Omit<PurchaseLot, "id" | "remainingQuantity" | "totalLotCost" | "unitCost" | "createdAt" | "updatedAt">) => void
  updatePurchaseLot: (id: string, lot: Omit<PurchaseLot, "id" | "remainingQuantity" | "totalLotCost" | "unitCost" | "createdAt" | "updatedAt">) => { ok: boolean; error?: string }
  removePurchaseLot: (id: string) => { ok: boolean; error?: string }
  addSale: (sale: Omit<Sale, "id" | "unitCost" | "totalCost" | "grossRevenue" | "netProfit" | "profitMargin" | "createdAt" | "updatedAt">) => { ok: boolean; error?: string }
  removeSale: (id: string) => void
  addStockAdjustment: (input: {
    productId: string
    purchaseLotId: string
    type: Extract<StockMovementType, "adjustment_in" | "adjustment_out" | "loss" | "return">
    quantity: number
    reason?: string | null
  }) => { ok: boolean; error?: string }
}

function nowIso() {
  return new Date().toISOString()
}

function makeMovement(input: Omit<StockMovement, "id" | "createdAt">): StockMovement {
  return {
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    ...input
  }
}

function isSkuDuplicated(products: Product[], sku: string, ignoreId?: string) {
  const normalized = sku.trim().toLowerCase()
  return products.some(
    (product) => product.id !== ignoreId && product.sku.trim().toLowerCase() === normalized
  )
}

export const useCommerceStore = create<CommerceStore>()(
  persist(
    (set) => ({
      products: [],
      purchaseLots: [],
      sales: [],
      stockMovements: [],
      addProduct: (product) => {
        let result: { ok: boolean; error?: string } = { ok: true }
        set((state) => {
          if (isSkuDuplicated(state.products, product.sku)) {
            result = { ok: false, error: "SKU já cadastrado." }
            return state
          }

          const timestamp = nowIso()
          return {
            products: [
              ...state.products,
              {
                ...product,
                id: crypto.randomUUID(),
                createdAt: timestamp,
                updatedAt: timestamp
              }
            ]
          }
        })
        return result
      },
      updateProduct: (product) => {
        let result: { ok: boolean; error?: string } = { ok: true }
        set((state) => {
          if (isSkuDuplicated(state.products, product.sku, product.id)) {
            result = { ok: false, error: "SKU já cadastrado." }
            return state
          }

          return {
            products: state.products.map((current) =>
              current.id === product.id
                ? { ...product, updatedAt: nowIso() }
                : current
            )
          }
        })
        return result
      },
      deactivateProduct: (id) =>
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id ? { ...product, isActive: false, updatedAt: nowIso() } : product
          )
        })),
      addPurchaseLot: (lot) =>
        set((state) => {
          const totals = calculateLotTotals(lot)
          const timestamp = nowIso()
          const nextLot: PurchaseLot = {
            ...lot,
            ...totals,
            id: crypto.randomUUID(),
            remainingQuantity: lot.quantity,
            createdAt: timestamp,
            updatedAt: timestamp
          }

          return {
            purchaseLots: [...state.purchaseLots, nextLot],
            stockMovements: [
              ...state.stockMovements,
              makeMovement({
                productId: nextLot.productId,
                purchaseLotId: nextLot.id,
                type: "purchase",
                quantity: nextLot.quantity,
                reason: "Entrada por lote de compra"
              })
            ]
          }
        }),
      updatePurchaseLot: (id, lot) => {
        let result: { ok: boolean; error?: string } = { ok: true }
        set((state) => {
          const existing = state.purchaseLots.find((item) => item.id === id)
          if (!existing) {
            result = { ok: false, error: "Lote não encontrado." }
            return state
          }

          const soldQty = existing.quantity - existing.remainingQuantity
          if (lot.quantity < soldQty) {
            result = { ok: false, error: `Quantidade não pode ser menor que ${soldQty} (já vendido/ajustado).` }
            return state
          }

          const totals = calculateLotTotals(lot)
          const updatedLot: PurchaseLot = {
            ...existing,
            ...lot,
            ...totals,
            remainingQuantity: lot.quantity - soldQty,
            updatedAt: nowIso()
          }

          return {
            purchaseLots: state.purchaseLots.map((item) => item.id === id ? updatedLot : item)
          }
        })
        return result
      },
      removePurchaseLot: (id) => {
        let result: { ok: boolean; error?: string } = { ok: true }
        set((state) => {
          const hasSales = state.sales.some((s) => s.purchaseLotId === id)
          if (hasSales) {
            result = { ok: false, error: "Este lote possui vendas vinculadas e não pode ser excluído." }
            return state
          }

          return {
            purchaseLots: state.purchaseLots.filter((item) => item.id !== id),
            stockMovements: state.stockMovements.filter((m) => m.purchaseLotId !== id)
          }
        })
        return result
      },
      addSale: (sale) => {
        let result: { ok: boolean; error?: string } = { ok: true }
        set((state) => {
          const lot = state.purchaseLots.find((item) => item.id === sale.purchaseLotId)
          if (!lot) {
            result = { ok: false, error: "Lote não encontrado." }
            return state
          }
          if (sale.quantity > lot.remainingQuantity) {
            result = { ok: false, error: "Quantidade maior que o estoque do lote." }
            return state
          }

          const saleResult = calculateSaleResult({
            salePrice: sale.salePrice,
            quantity: sale.quantity,
            unitCost: lot.unitCost,
            marketplaceFee: sale.marketplaceFee,
            shippingCost: sale.shippingCost,
            packagingCost: sale.packagingCost,
            otherCosts: sale.otherCosts
          })
          const timestamp = nowIso()
          const nextSale: Sale = {
            ...sale,
            unitCost: lot.unitCost,
            totalCost: saleResult.totalCost,
            grossRevenue: saleResult.grossRevenue,
            netProfit: saleResult.netProfit,
            profitMargin: saleResult.profitMargin,
            id: crypto.randomUUID(),
            createdAt: timestamp,
            updatedAt: timestamp
          }

          return {
            purchaseLots: state.purchaseLots.map((item) =>
              item.id === lot.id
                ? {
                    ...item,
                    remainingQuantity: item.remainingQuantity - sale.quantity,
                    updatedAt: timestamp
                  }
                : item
            ),
            sales: [...state.sales, nextSale],
            stockMovements: [
              ...state.stockMovements,
              makeMovement({
                productId: nextSale.productId,
                purchaseLotId: nextSale.purchaseLotId,
                type: "sale",
                quantity: nextSale.quantity,
                reason: `Venda em ${nextSale.marketplace}`
              })
            ]
          }
        })
        return result
      },
      removeSale: (id) =>
        set((state) => {
          const sale = state.sales.find((item) => item.id === id)
          if (!sale) {
            return state
          }

          return {
            sales: state.sales.filter((item) => item.id !== id),
            purchaseLots: state.purchaseLots.map((lot) =>
              lot.id === sale.purchaseLotId
                ? {
                    ...lot,
                    remainingQuantity: lot.remainingQuantity + sale.quantity,
                    updatedAt: nowIso()
                  }
                : lot
            ),
            stockMovements: [
              ...state.stockMovements,
              makeMovement({
                productId: sale.productId,
                purchaseLotId: sale.purchaseLotId,
                type: "return",
                quantity: sale.quantity,
                reason: "Venda removida"
              })
            ]
          }
        }),
      addStockAdjustment: (input) => {
        let result: { ok: boolean; error?: string } = { ok: true }
        set((state) => {
          const lot = state.purchaseLots.find((item) => item.id === input.purchaseLotId)
          if (!lot) {
            result = { ok: false, error: "Lote não encontrado." }
            return state
          }

          const isOutput = input.type === "adjustment_out" || input.type === "loss"
          if (isOutput && input.quantity > lot.remainingQuantity) {
            result = { ok: false, error: "Ajuste deixaria o estoque negativo." }
            return state
          }

          const nextQuantity = isOutput
            ? lot.remainingQuantity - input.quantity
            : lot.remainingQuantity + input.quantity

          return {
            purchaseLots: state.purchaseLots.map((item) =>
              item.id === lot.id
                ? { ...item, remainingQuantity: nextQuantity, updatedAt: nowIso() }
                : item
            ),
            stockMovements: [
              ...state.stockMovements,
              makeMovement({
                productId: input.productId,
                purchaseLotId: input.purchaseLotId,
                type: input.type,
                quantity: input.quantity,
                reason: input.reason || null
              })
            ]
          }
        })
        return result
      }
    }),
    {
      name: "devfinances-commerce-storage",
      storage: createJSONStorage(() => localStorage),
      version: 1
    }
  )
)
