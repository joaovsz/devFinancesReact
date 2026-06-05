export type Marketplace = "mercado_livre" | "shopee" | "olx" | "instagram" | "direct" | "other"

export type Product = {
  id: string
  name: string
  brand: string | null
  model: string | null
  sku: string
  category: string | null
  supplierUrl: string | null
  imageUrl: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type PurchaseLot = {
  id: string
  productId: string
  quantity: number
  remainingQuantity: number
  productCostTotal: number
  internationalShippingTotal: number
  taxTotal: number
  packagingTotal: number
  otherCostsTotal: number
  dollarRate: number | null
  totalLotCost: number
  unitCost: number
  supplierName: string | null
  supplierOrderCode: string | null
  purchasedAt: string
  createdAt: string
  updatedAt: string
}

export type Sale = {
  id: string
  productId: string
  purchaseLotId: string
  marketplace: Marketplace
  quantity: number
  salePrice: number
  marketplaceFee: number
  shippingCost: number
  packagingCost: number
  otherCosts: number
  unitCost: number
  totalCost: number
  grossRevenue: number
  netProfit: number
  profitMargin: number
  soldAt: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type StockMovementType =
  | "purchase"
  | "sale"
  | "adjustment_in"
  | "adjustment_out"
  | "loss"
  | "return"

export type StockMovement = {
  id: string
  productId: string
  purchaseLotId: string | null
  type: StockMovementType
  quantity: number
  reason: string | null
  createdAt: string
}
