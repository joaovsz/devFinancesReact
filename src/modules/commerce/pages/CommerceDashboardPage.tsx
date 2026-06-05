import { ReactNode, useEffect, useMemo, useState } from "react"
import {
  BarChart3,
  Calculator,
  ChevronDown,
  ClipboardList,
  PackagePlus,
  Pencil,
  ReceiptText,
  ShoppingBag,
  Trash2,
  Warehouse
} from "lucide-react"
import {
  pricingSimulatorSchema,
  productFormSchema,
  purchaseLotFormSchema,
  saleFormSchema
} from "../schemas/commerce.schemas"
import { useCommerceStore } from "../store/useCommerceStore"
import { Marketplace, PurchaseLot } from "../types/commerce.types"
import {
  calculateLotTotals,
  calculateMinimumPrice,
  calculateSaleResult,
  getLotStockValue
} from "../utils/calculate-pricing"
import {
  calculateImportTaxes,
  ImportRegime,
  STATE_TAX_OPTIONS
} from "../utils/import-taxes"
import { formatCurrencyInput, parseCurrencyInput, formatRateInput, parseRateInput, formatUsdInput, parseUsdInput } from "../../../utils/currency-input"
import { useDollarRate } from "../../../hooks/useDollarRate"

type CommerceTab = "dashboard" | "products" | "lots" | "pricing" | "sales" | "stock" | "reports"

const inputClassName =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
const selectClassName =
  "w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-9 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
const labelClassName = "grid gap-1 text-xs font-medium text-zinc-400"
const moneyFields = new Set([
  "productCostTotal",
  "internationalShippingTotal",
  "taxTotal",
  "packagingTotal",
  "otherCostsTotal",
  "salePrice",
  "marketplaceFee",
  "shippingCost",
  "packagingCost",
  "otherCosts",
  "fixedFee"
])

const marketplaceOptions: Array<{ value: Marketplace; label: string }> = [
  { value: "mercado_livre", label: "Mercado Livre" },
  { value: "shopee", label: "Shopee" },
  { value: "olx", label: "OLX" },
  { value: "instagram", label: "Instagram" },
  { value: "direct", label: "Venda direta" },
  { value: "other", label: "Outro" }
]

const today = new Date().toISOString().slice(0, 10)

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`
}

function getMonthKey(date: string) {
  return date.slice(0, 7)
}

function getProductName(productId: string, products: ReturnType<typeof useCommerceStore.getState>["products"]) {
  return products.find((product) => product.id === productId)?.name || "Produto removido"
}

const usdFields = new Set(["unitPriceUsd", "shippingUsd", "insuranceUsd"])
const rateFields = new Set(["dollarRate"])

function toMoneyInput(value: string, field: string) {
  if (moneyFields.has(field)) return formatCurrencyInput(value)
  if (usdFields.has(field)) return formatUsdInput(value)
  if (rateFields.has(field)) return formatRateInput(value)
  return value
}

function getAvailableLots(lots: PurchaseLot[], productId?: string) {
  return lots.filter((lot) => lot.remainingQuantity > 0 && (!productId || lot.productId === productId))
}

function SelectField({
  value,
  onChange,
  children
}: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div className="relative w-full min-w-0">
      <select
        className={selectClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
      />
    </div>
  )
}

export function CommerceDashboardPage() {
  const products = useCommerceStore((state) => state.products)
  const purchaseLots = useCommerceStore((state) => state.purchaseLots)
  const sales = useCommerceStore((state) => state.sales)
  const stockMovements = useCommerceStore((state) => state.stockMovements)
  const addProduct = useCommerceStore((state) => state.addProduct)
  const updateProduct = useCommerceStore((state) => state.updateProduct)
  const deactivateProduct = useCommerceStore((state) => state.deactivateProduct)
  const addPurchaseLot = useCommerceStore((state) => state.addPurchaseLot)
  const updatePurchaseLot = useCommerceStore((state) => state.updatePurchaseLot)
  const removePurchaseLot = useCommerceStore((state) => state.removePurchaseLot)
  const addSale = useCommerceStore((state) => state.addSale)
  const removeSale = useCommerceStore((state) => state.removeSale)
  const addStockAdjustment = useCommerceStore((state) => state.addStockAdjustment)
  const [activeTab, setActiveTab] = useState<CommerceTab>("dashboard")
  const [statusMessage, setStatusMessage] = useState("")
  const [editingProductId, setEditingProductId] = useState("")
  const [productForm, setProductForm] = useState({
    name: "",
    brand: "",
    model: "",
    sku: "",
    category: "",
    supplierUrl: "",
    imageUrl: "",
    notes: "",
    isActive: true
  })
  const [lotForm, setLotForm] = useState({
    productId: "",
    quantity: "1",
    unitPriceUsd: "",
    shippingUsd: "",
    insuranceUsd: "",
    productCostTotal: "",
    internationalShippingTotal: "",
    taxTotal: "",
    packagingTotal: "",
    otherCostsTotal: "",
    dollarRate: "",
    supplierName: "",
    supplierOrderCode: "",
    purchasedAt: today
  })
  const [saleForm, setSaleForm] = useState({
    productId: "",
    purchaseLotId: "",
    marketplace: "mercado_livre" as Marketplace,
    quantity: "1",
    salePrice: "",
    marketplaceFee: "",
    shippingCost: "",
    packagingCost: "",
    otherCosts: "",
    soldAt: today,
    notes: ""
  })
  const [simulatorForm, setSimulatorForm] = useState({
    purchaseLotId: "",
    marketplace: "mercado_livre" as Marketplace,
    quantity: "1",
    salePrice: "",
    feePercent: "16",
    fixedFee: "",
    shippingCost: "",
    packagingCost: "",
    otherCosts: "",
    desiredMarginPercent: "20"
  })
  const [adjustmentForm, setAdjustmentForm] = useState({
    purchaseLotId: "",
    type: "adjustment_in" as "adjustment_in" | "adjustment_out" | "loss" | "return",
    quantity: "1",
    reason: ""
  })
  const [taxCalc, setTaxCalc] = useState({
    show: false,
    regime: "remessa_conforme" as ImportRegime,
    icmsRate: STATE_TAX_OPTIONS[0].rate,
  })
  const [showLotsModal, setShowLotsModal] = useState(false)
  const [editingLotId, setEditingLotId] = useState<string | null>(null)
  const [confirmDeleteLotId, setConfirmDeleteLotId] = useState<string | null>(null)
  const [showProductsModal, setShowProductsModal] = useState(false)
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showMovementsModal, setShowMovementsModal] = useState(false)
  const { rate: apiDollarRate, loading: loadingRate, error: rateError, refetch: refreshRate, lastUpdated: rateUpdatedAt } = useDollarRate()

  // Pre-fill dollar rate from API when it loads and the field is still empty
  useEffect(() => {
    if (apiDollarRate !== null && !lotForm.dollarRate) {
      setLotForm((current) => ({ ...current, dollarRate: formatRateInput(apiDollarRate.toFixed(4)) }))
    }
  }, [apiDollarRate])
  const currentMonth = new Date().toISOString().slice(0, 7)
  const activeProducts = products.filter((product) => product.isActive)
  const availableLots = getAvailableLots(purchaseLots)
  const selectedLotForSimulator = purchaseLots.find((lot) => lot.id === simulatorForm.purchaseLotId)
  const selectedLotForSale = purchaseLots.find((lot) => lot.id === saleForm.purchaseLotId)

  // --- Computed lot USD values ---
  const currentDollarRate = lotForm.dollarRate
    ? parseRateInput(lotForm.dollarRate)
    : (apiDollarRate ?? 0)
  const lotQty = Number(lotForm.quantity || 0)
  const unitPriceUsdVal = parseUsdInput(lotForm.unitPriceUsd)
  const shippingUsdVal = parseUsdInput(lotForm.shippingUsd)
  const insuranceUsdVal = parseUsdInput(lotForm.insuranceUsd)
  const productCostBrl = unitPriceUsdVal > 0 && currentDollarRate > 0
    ? unitPriceUsdVal * lotQty * currentDollarRate
    : parseCurrencyInput(lotForm.productCostTotal)
  const shippingBrl = shippingUsdVal > 0 && currentDollarRate > 0
    ? shippingUsdVal * currentDollarRate
    : parseCurrencyInput(lotForm.internationalShippingTotal)

  // --- Import tax calculator ---
  const taxCalcResult = (productCostBrl > 0 || shippingBrl > 0) && currentDollarRate > 0
    ? calculateImportTaxes({
        productValueUsd: unitPriceUsdVal,
        internationalShippingUsd: shippingUsdVal,
        insuranceUsd: insuranceUsdVal,
        dollarRate: currentDollarRate,
        icmsRate: taxCalc.icmsRate,
        regime: taxCalc.regime,
        quantity: lotQty > 0 ? lotQty : 1
      })
    : null

  const dashboardMetrics = useMemo(() => {
    const monthSales = sales.filter((sale) => getMonthKey(sale.soldAt) === currentMonth)
    const grossRevenue = monthSales.reduce((sum, sale) => sum + sale.grossRevenue, 0)
    const netProfit = monthSales.reduce((sum, sale) => sum + sale.netProfit, 0)
    const stockCostValue = purchaseLots.reduce((sum, lot) => sum + getLotStockValue(lot), 0)
    const potentialStockRevenue = purchaseLots.reduce((sum, lot) => {
      const productSales = sales.filter((sale) => sale.productId === lot.productId)
      const lastSalePrice = productSales.at(-1)?.salePrice || 0
      return sum + lot.remainingQuantity * lastSalePrice
    }, 0)
    const stockUnits = purchaseLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0)

    return {
      grossRevenue,
      netProfit,
      averageMargin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0,
      stockCostValue,
      potentialStockRevenue,
      activeProductsCount: activeProducts.length,
      stockUnits
    }
  }, [activeProducts.length, currentMonth, purchaseLots, sales])

  const lotPreview = calculateLotTotals({
    quantity: lotQty,
    productCostTotal: productCostBrl,
    internationalShippingTotal: shippingBrl,
    taxTotal: parseCurrencyInput(lotForm.taxTotal),
    packagingTotal: parseCurrencyInput(lotForm.packagingTotal),
    otherCostsTotal: parseCurrencyInput(lotForm.otherCostsTotal)
  })
  const simulatorMarketplaceFee =
    parseCurrencyInput(simulatorForm.salePrice) *
      Number(simulatorForm.quantity || 0) *
      (Number(simulatorForm.feePercent.replace(",", ".") || 0) / 100) +
    parseCurrencyInput(simulatorForm.fixedFee)
  const simulatorResult = selectedLotForSimulator
    ? calculateSaleResult({
        salePrice: parseCurrencyInput(simulatorForm.salePrice),
        quantity: Number(simulatorForm.quantity || 0),
        unitCost: selectedLotForSimulator.unitCost,
        marketplaceFee: simulatorMarketplaceFee,
        shippingCost: parseCurrencyInput(simulatorForm.shippingCost),
        packagingCost: parseCurrencyInput(simulatorForm.packagingCost),
        otherCosts: parseCurrencyInput(simulatorForm.otherCosts)
      })
    : null
  const minimumPrice = selectedLotForSimulator
    ? calculateMinimumPrice({
        unitCost: selectedLotForSimulator.unitCost,
        fixedCosts:
          parseCurrencyInput(simulatorForm.fixedFee) +
          parseCurrencyInput(simulatorForm.shippingCost) +
          parseCurrencyInput(simulatorForm.packagingCost) +
          parseCurrencyInput(simulatorForm.otherCosts),
        marketplaceFeePercent: Number(simulatorForm.feePercent.replace(",", ".") || 0),
        desiredMarginPercent: Number(simulatorForm.desiredMarginPercent.replace(",", ".") || 0)
      })
    : 0

  function updateProductForm(field: keyof typeof productForm, value: string | boolean) {
    setProductForm((current) => ({ ...current, [field]: value }))
  }

  function updateLotForm(field: keyof typeof lotForm, value: string) {
    setLotForm((current) => ({ ...current, [field]: toMoneyInput(value, field) }))
  }

  function updateSaleForm(field: keyof typeof saleForm, value: string) {
    setSaleForm((current) => ({ ...current, [field]: toMoneyInput(value, field) }))
  }

  function updateSimulatorForm(field: keyof typeof simulatorForm, value: string) {
    setSimulatorForm((current) => ({ ...current, [field]: toMoneyInput(value, field) }))
  }

  function resetProductForm() {
    setEditingProductId("")
    setProductForm({
      name: "",
      brand: "",
      model: "",
      sku: "",
      category: "",
      supplierUrl: "",
      imageUrl: "",
      notes: "",
      isActive: true
    })
  }

  function submitProduct() {
    const parsed = productFormSchema.safeParse(productForm)
    if (!parsed.success) {
      setStatusMessage(parsed.error.issues[0]?.message || "Revise o produto.")
      return
    }

    if (editingProductId) {
      const current = products.find((product) => product.id === editingProductId)
      if (!current) {
        resetProductForm()
        return
      }
      const result = updateProduct({ ...current, ...parsed.data })
      setStatusMessage(result.ok ? "Produto atualizado." : result.error || "Falha ao atualizar.")
      if (result.ok) {
        resetProductForm()
      }
      return
    }

    const result = addProduct(parsed.data)
    setStatusMessage(result.ok ? "Produto cadastrado." : result.error || "Falha ao cadastrar.")
    if (result.ok) {
      resetProductForm()
    }
  }

  function editProduct(productId: string) {
    const product = products.find((item) => item.id === productId)
    if (!product) {
      return
    }
    setEditingProductId(product.id)
    setProductForm({
      name: product.name,
      brand: product.brand || "",
      model: product.model || "",
      sku: product.sku,
      category: product.category || "",
      supplierUrl: product.supplierUrl || "",
      imageUrl: product.imageUrl || "",
      notes: product.notes || "",
      isActive: product.isActive
    })
    setActiveTab("products")
  }

  function startEditLot(lot: typeof purchaseLots[number]) {
    setLotForm({
      productId: lot.productId,
      quantity: String(lot.quantity),
      unitPriceUsd: "",
      shippingUsd: "",
      insuranceUsd: "",
      productCostTotal: formatCurrency(lot.productCostTotal),
      internationalShippingTotal: formatCurrency(lot.internationalShippingTotal),
      taxTotal: formatCurrency(lot.taxTotal),
      packagingTotal: formatCurrency(lot.packagingTotal),
      otherCostsTotal: formatCurrency(lot.otherCostsTotal),
      dollarRate: lot.dollarRate ? formatRateInput(lot.dollarRate.toFixed(4)) : "",
      supplierName: lot.supplierName || "",
      supplierOrderCode: lot.supplierOrderCode || "",
      purchasedAt: lot.purchasedAt
    })
    setEditingLotId(lot.id)
    setShowLotsModal(false)
  }

  function cancelEditLot() {
    setEditingLotId(null)
    setLotForm({
      productId: "",
      quantity: "1",
      unitPriceUsd: "",
      shippingUsd: "",
      insuranceUsd: "",
      productCostTotal: "",
      internationalShippingTotal: "",
      taxTotal: "",
      packagingTotal: "",
      otherCostsTotal: "",
      dollarRate: currentDollarRate > 0 ? formatRateInput(currentDollarRate.toFixed(4)) : "",
      supplierName: "",
      supplierOrderCode: "",
      purchasedAt: today
    })
  }

  function submitLot() {
    // Inject computed BRL values from USD inputs before parsing
    const finalLotForm = {
      ...lotForm,
      productCostTotal:
        unitPriceUsdVal > 0 && currentDollarRate > 0
          ? formatCurrency(productCostBrl)
          : lotForm.productCostTotal,
      internationalShippingTotal:
        shippingUsdVal > 0 && currentDollarRate > 0
          ? formatCurrency(shippingBrl)
          : lotForm.internationalShippingTotal,
      dollarRate: currentDollarRate > 0 ? String(currentDollarRate) : lotForm.dollarRate
    }
    const parsed = purchaseLotFormSchema.safeParse(finalLotForm)
    if (!parsed.success) {
      setStatusMessage(parsed.error.issues[0]?.message || "Revise o lote.")
      return
    }

    if (editingLotId) {
      const result = updatePurchaseLot(editingLotId, parsed.data)
      if (!result.ok) {
        setStatusMessage(result.error || "Erro ao atualizar lote.")
        return
      }
      setStatusMessage("Lote atualizado com sucesso.")
      setEditingLotId(null)
    } else {
      addPurchaseLot(parsed.data)
      setStatusMessage("Lote cadastrado e estoque registrado.")
    }

    setLotForm({
      productId: parsed.data.productId,
      quantity: "1",
      unitPriceUsd: "",
      shippingUsd: "",
      insuranceUsd: "",
      productCostTotal: "",
      internationalShippingTotal: "",
      taxTotal: "",
      packagingTotal: "",
      otherCostsTotal: "",
      dollarRate: currentDollarRate > 0 ? String(currentDollarRate.toFixed(4)) : "",
      supplierName: "",
      supplierOrderCode: "",
      purchasedAt: today
    })
  }

  function submitSale() {
    const parsed = saleFormSchema.safeParse(saleForm)
    if (!parsed.success) {
      setStatusMessage(parsed.error.issues[0]?.message || "Revise a venda.")
      return
    }

    const result = addSale(parsed.data)
    setStatusMessage(result.ok ? "Venda registrada e estoque baixado." : result.error || "Falha na venda.")
    if (result.ok) {
      setSaleForm((current) => ({
        ...current,
        quantity: "1",
        salePrice: "",
        marketplaceFee: "",
        shippingCost: "",
        packagingCost: "",
        otherCosts: "",
        notes: "",
        soldAt: today
      }))
    }
  }

  function submitAdjustment() {
    const lot = purchaseLots.find((item) => item.id === adjustmentForm.purchaseLotId)
    if (!lot) {
      setStatusMessage("Selecione um lote para ajustar.")
      return
    }

    const quantity = Number(adjustmentForm.quantity || 0)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setStatusMessage("Quantidade do ajuste deve ser maior que zero.")
      return
    }

    const result = addStockAdjustment({
      productId: lot.productId,
      purchaseLotId: lot.id,
      type: adjustmentForm.type,
      quantity,
      reason: adjustmentForm.reason
    })
    setStatusMessage(result.ok ? "Estoque ajustado." : result.error || "Falha no ajuste.")
  }

  function productStock(productId: string) {
    return purchaseLots
      .filter((lot) => lot.productId === productId)
      .reduce((sum, lot) => sum + lot.remainingQuantity, 0)
  }

  function weightedAverageCost(productId: string) {
    const lots = purchaseLots.filter((lot) => lot.productId === productId && lot.remainingQuantity > 0)
    const quantity = lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0)
    const cost = lots.reduce((sum, lot) => sum + lot.remainingQuantity * lot.unitCost, 0)
    return quantity > 0 ? cost / quantity : 0
  }

  function productProfit(productId: string) {
    return sales
      .filter((sale) => sale.productId === productId)
      .reduce((sum, sale) => sum + sale.netProfit, 0)
  }

  function lastSaleDate(productId: string) {
    return sales
      .filter((sale) => sale.productId === productId)
      .map((sale) => sale.soldAt)
      .sort()
      .at(-1)
  }

  const productRows = products.map((product) => ({
    product,
    stock: productStock(product.id),
    averageCost: weightedAverageCost(product.id),
    profit: productProfit(product.id)
  }))
  const productReports = productRows.map((row) => {
    const productSales = sales.filter((sale) => sale.productId === row.product.id)
    const grossRevenue = productSales.reduce((sum, sale) => sum + sale.grossRevenue, 0)
    const netProfit = productSales.reduce((sum, sale) => sum + sale.netProfit, 0)
    const soldQuantity = productSales.reduce((sum, sale) => sum + sale.quantity, 0)
    return {
      ...row,
      soldQuantity,
      grossRevenue,
      netProfit,
      averageTicket: productSales.length > 0 ? grossRevenue / productSales.length : 0,
      margin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0
    }
  })
  const marketplaceReports = marketplaceOptions.map((marketplace) => {
    const marketplaceSales = sales.filter((sale) => sale.marketplace === marketplace.value)
    const grossRevenue = marketplaceSales.reduce((sum, sale) => sum + sale.grossRevenue, 0)
    const netProfit = marketplaceSales.reduce((sum, sale) => sum + sale.netProfit, 0)
    return {
      marketplace,
      grossRevenue,
      netProfit,
      orders: marketplaceSales.length,
      averageTicket: marketplaceSales.length > 0 ? grossRevenue / marketplaceSales.length : 0,
      margin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0
    }
  }).filter((row) => row.orders > 0)

  const tabs: Array<{ id: CommerceTab; label: string; icon: typeof BarChart3 }> = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "products", label: "Produtos", icon: ShoppingBag },
    { id: "lots", label: "Lotes", icon: PackagePlus },
    { id: "pricing", label: "Simulador", icon: Calculator },
    { id: "sales", label: "Vendas", icon: ReceiptText },
    { id: "stock", label: "Estoque", icon: Warehouse },
    { id: "reports", label: "Relatórios", icon: ClipboardList }
  ]

  return (
    <section className="grid gap-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Commerce</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Produtos, lotes, estoque, precificação e lucro por marketplace.
            </p>
          </div>
          {statusMessage && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              {statusMessage}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                  activeTab === tab.id
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
                }`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === "dashboard" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Faturamento do mês", formatCurrency(dashboardMetrics.grossRevenue)],
            ["Lucro líquido do mês", formatCurrency(dashboardMetrics.netProfit)],
            ["Margem média", formatPercent(dashboardMetrics.averageMargin)],
            ["Estoque a custo", formatCurrency(dashboardMetrics.stockCostValue)],
            ["Potencial de venda", formatCurrency(dashboardMetrics.potentialStockRevenue)],
            ["Produtos ativos", String(dashboardMetrics.activeProductsCount)],
            ["Unidades em estoque", String(dashboardMetrics.stockUnits)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
              <p className="mt-2 text-lg font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "products" && (
        <>
          {showProductsModal && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 pt-16">
              <div className="w-full max-w-5xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
                  <h2 className="text-sm font-semibold text-zinc-100">Produtos cadastrados</h2>
                  <button type="button" className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100" onClick={() => setShowProductsModal(false)}>✕ Fechar</button>
                </div>
                <div className="p-4">
                  {productRows.length === 0 && (
                    <p className="py-8 text-center text-xs text-zinc-500">Nenhum produto cadastrado.</p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {productRows.map(({ product, stock, averageCost }) => (
                      <div key={product.id} className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 hover:border-zinc-700 transition">
                        {/* Imagem quadrada grande */}
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              onError={(e) => { (e.currentTarget.parentElement as HTMLElement).innerHTML = `<div class="flex h-full w-full items-center justify-center text-zinc-600"><svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z'/><line x1='3' y1='6' x2='21' y2='6'/><path d='M16 10a4 4 0 0 1-8 0'/></svg></div>` }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-zinc-600">
                              <ShoppingBag size={24} />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div>
                            <p className="truncate text-sm font-medium text-zinc-100">{product.name}</p>
                            {(product.brand || product.model) && (
                              <p className="truncate text-xs text-zinc-500">{[product.brand, product.model].filter(Boolean).join(" ")}</p>
                            )}
                            {product.sku && <p className="mt-0.5 text-xs text-zinc-600">SKU: {product.sku}</p>}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="text-zinc-400">{stock} un</span>
                            <span className="font-medium text-emerald-300">{formatCurrency(averageCost)}</span>
                            <span className={`rounded-full px-2 py-0.5 ${product.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-800 text-zinc-500"}`}>
                              {product.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                          <div className="mt-2 flex gap-3">
                            <button className="text-xs text-emerald-300 hover:text-emerald-100" type="button" onClick={() => { editProduct(product.id); setShowProductsModal(false) }}>Editar</button>
                            {product.isActive && <button className="text-xs text-rose-300 hover:text-rose-100" type="button" onClick={() => deactivateProduct(product.id)}>Inativar</button>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">{editingProductId ? "Editar produto" : "Novo produto"}</h2>
              <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100" onClick={() => setShowProductsModal(true)}>
                <ShoppingBag size={14} />
                Ver produtos ({products.length})
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-3 content-start">
                <label className={labelClassName}>Nome<input className={inputClassName} placeholder="Ex: iPhone 15 Pro Max" value={productForm.name} onChange={(e) => updateProductForm("name", e.target.value)} /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={labelClassName}>Marca<input className={inputClassName} placeholder="Ex: Apple" value={productForm.brand} onChange={(e) => updateProductForm("brand", e.target.value)} /></label>
                  <label className={labelClassName}>Modelo<input className={inputClassName} placeholder="Ex: A3293" value={productForm.model} onChange={(e) => updateProductForm("model", e.target.value)} /></label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className={labelClassName}>SKU<input className={inputClassName} placeholder="Ex: IPH15PM-256-PT" value={productForm.sku} onChange={(e) => updateProductForm("sku", e.target.value)} /></label>
                  <label className={labelClassName}>Categoria<input className={inputClassName} placeholder="Ex: Eletrônicos" value={productForm.category} onChange={(e) => updateProductForm("category", e.target.value)} /></label>
                </div>
              </div>
              <div className="grid gap-3 content-start">
                <label className={labelClassName}>URL fornecedor<input className={inputClassName} placeholder="https://pt.aliexpress.com/item/..." value={productForm.supplierUrl} onChange={(e) => updateProductForm("supplierUrl", e.target.value)} /></label>
                <label className={labelClassName}>URL imagem<input className={inputClassName} placeholder="https://..." value={productForm.imageUrl} onChange={(e) => updateProductForm("imageUrl", e.target.value)} /></label>
                {productForm.imageUrl && (
                  <div className="flex justify-center">
                    <div className="aspect-square w-full max-w-[224px] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950">
                      <img
                        src={productForm.imageUrl}
                        alt="Prévia"
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none" }}
                      />
                    </div>
                  </div>
                )}
                <label className={labelClassName}>Notas<input className={inputClassName} placeholder="Observações sobre o produto" value={productForm.notes} onChange={(e) => updateProductForm("notes", e.target.value)} /></label>
              </div>
              <div className="grid gap-3 content-start">
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input type="checkbox" checked={productForm.isActive} onChange={(e) => updateProductForm("isActive", e.target.checked)} />
                  Produto ativo
                </label>
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500" type="button" onClick={resetProductForm}>Limpar</button>
                  <button className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-950" type="button" onClick={submitProduct}>Salvar</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "lots" && (
        <>
          {/* Modal — listagem de lotes */}
          {showLotsModal && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 pt-16">
              <div className="w-full max-w-5xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
                  <h2 className="text-sm font-semibold text-zinc-100">Lotes cadastrados</h2>
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100"
                    onClick={() => setShowLotsModal(false)}
                  >
                    ✕ Fechar
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Fornecedor</th>
                        <th className="px-4 py-3 text-right">Qtde</th>
                        <th className="px-4 py-3 text-right">Saldo</th>
                        <th className="px-4 py-3 text-right">Custo unitário</th>
                        <th className="px-4 py-3 text-right">Total lote</th>
                        <th className="px-4 py-3 text-right">Cotação</th>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseLots.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-6 text-center text-xs text-zinc-500">
                            Nenhum lote cadastrado ainda.
                          </td>
                        </tr>
                      )}
                      {purchaseLots.map((lot) => (
                        <tr key={lot.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                          <td className="px-4 py-3 text-zinc-200">{getProductName(lot.productId, products)}</td>
                          <td className="px-4 py-3 text-zinc-400">{lot.supplierName || "—"}</td>
                          <td className="px-4 py-3 text-right text-zinc-300">{lot.quantity}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={lot.remainingQuantity === 0 ? "text-zinc-500" : "text-emerald-300"}>
                              {lot.remainingQuantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-300">{formatCurrency(lot.unitCost)}</td>
                          <td className="px-4 py-3 text-right text-zinc-200">{formatCurrency(lot.totalLotCost)}</td>
                          <td className="px-4 py-3 text-right text-zinc-400">
                            {lot.dollarRate ? `R$ ${lot.dollarRate.toFixed(2)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">{lot.purchasedAt}</td>
                          <td className="px-4 py-3">
                            {confirmDeleteLotId === lot.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-rose-400">Excluir?</span>
                                <button
                                  type="button"
                                  className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/40"
                                  onClick={() => {
                                    const result = removePurchaseLot(lot.id)
                                    if (!result.ok) setStatusMessage(result.error || "Erro ao excluir.")
                                    setConfirmDeleteLotId(null)
                                  }}
                                >Sim</button>
                                <button
                                  type="button"
                                  className="rounded-lg bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
                                  onClick={() => setConfirmDeleteLotId(null)}
                                >Não</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  title="Editar lote"
                                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
                                  onClick={() => startEditLot(lot)}
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  title="Excluir lote"
                                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-500/20 hover:text-rose-400"
                                  onClick={() => setConfirmDeleteLotId(lot.id)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Formulário horizontal */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-zinc-100">
                  {editingLotId ? "Editar lote" : "Novo lote de compra"}
                </h2>
                {editingLotId && (
                  <button
                    type="button"
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                    onClick={cancelEditLot}
                  >
                    ✕ Cancelar edição
                  </button>
                )}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
                onClick={() => setShowLotsModal(true)}
              >
                <Warehouse size={14} />
                Ver lotes ({purchaseLots.length})
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Col 1 — Produto / Qtde / Câmbio */}
              <div className="grid gap-3 content-start">
                <label className={labelClassName}>
                  Produto
                  <SelectField value={lotForm.productId} onChange={(value) => updateLotForm("productId", value)}>
                    <option value="">Selecionar</option>
                    {activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </SelectField>
                </label>
                <label className={labelClassName}>
                  Quantidade
                  <input className={inputClassName} type="number" min="1" placeholder="Ex: 5" value={lotForm.quantity} onChange={(e) => updateLotForm("quantity", e.target.value)} />
                </label>

                {/* Câmbio */}
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-300">Câmbio USD → BRL</span>
                    <button
                      type="button"
                      className="text-xs text-indigo-300 hover:text-indigo-100 disabled:opacity-50"
                      onClick={refreshRate}
                      disabled={loadingRate}
                    >
                      {loadingRate ? "…" : "↻"}
                    </button>
                  </div>
                  <label className={labelClassName}>
                    Cotação (R$/USD)
                    <input
                      className={inputClassName}
                      placeholder={loadingRate ? "Buscando…" : "Ex: 5,7500"}
                      value={lotForm.dollarRate}
                      onChange={(e) => updateLotForm("dollarRate", e.target.value)}
                    />
                  </label>
                  {rateError && <p className="mt-1 text-xs text-rose-400">{rateError}</p>}
                  {rateUpdatedAt && !rateError && (
                    <p className="mt-1 text-xs text-zinc-500">
                      AwesomeAPI · {new Date(rateUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>

              {/* Col 2 — Preço, Frete, Seguro + conversão */}
              <div className="grid gap-3 content-start">
                <label className={labelClassName}>
                  Preço unitário (USD)
                  <input
                    className={inputClassName}
                    value={lotForm.unitPriceUsd}
                    onChange={(e) => updateLotForm("unitPriceUsd", e.target.value)}
                    placeholder="U$ 0,00"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={labelClassName}>
                    Frete (USD)
                    <input
                      className={inputClassName}
                      value={lotForm.shippingUsd}
                      onChange={(e) => updateLotForm("shippingUsd", e.target.value)}
                      placeholder="U$ 0,00"
                    />
                  </label>
                  <label className={labelClassName}>
                    Seguro (USD)
                    <input
                      className={inputClassName}
                      value={lotForm.insuranceUsd}
                      onChange={(e) => updateLotForm("insuranceUsd", e.target.value)}
                      placeholder="U$ 0,00"
                    />
                  </label>
                </div>

                {/* Conversão BRL */}
                {(unitPriceUsdVal > 0 || shippingUsdVal > 0) && currentDollarRate > 0 && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-xs text-emerald-300 space-y-0.5">
                    {unitPriceUsdVal > 0 && (
                      <div className="flex justify-between">
                        <span>{lotQty} × {lotForm.unitPriceUsd} × R$ {currentDollarRate.toFixed(4)}</span>
                        <strong>{formatCurrency(productCostBrl)}</strong>
                      </div>
                    )}
                    {shippingUsdVal > 0 && (
                      <div className="flex justify-between">
                        <span>Frete {lotForm.shippingUsd} × R$ {currentDollarRate.toFixed(4)}</span>
                        <strong>{formatCurrency(shippingBrl)}</strong>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <label className={labelClassName}>Embalagens<input className={inputClassName} placeholder="R$ 0,00" value={lotForm.packagingTotal} onChange={(e) => updateLotForm("packagingTotal", e.target.value)} /></label>
                  <label className={labelClassName}>Outros custos<input className={inputClassName} placeholder="R$ 0,00" value={lotForm.otherCostsTotal} onChange={(e) => updateLotForm("otherCostsTotal", e.target.value)} /></label>
                </div>
              </div>

              {/* Col 3 — Impostos + infos + preview */}
              <div className="grid gap-3 content-start">
                {/* Impostos */}
                <div className="rounded-xl border border-zinc-700 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-zinc-300">Impostos de importação</p>
                    <button
                      type="button"
                      className="text-xs text-amber-400 hover:text-amber-200"
                      onClick={() => setTaxCalc((c) => ({ ...c, show: !c.show }))}
                    >
                      {taxCalc.show ? "Fechar" : "✦ Calcular"}
                    </button>
                  </div>

                  {taxCalc.show && (
                    <div className="mt-2 grid gap-2">
                      <label className={labelClassName}>
                        Regime
                        <SelectField
                          value={taxCalc.regime}
                          onChange={(v) => setTaxCalc((c) => ({ ...c, regime: v as ImportRegime }))}
                        >
                          <option value="remessa_conforme">Remessa Conforme (AliExpress, Shopee…)</option>
                          <option value="fora_remessa_conforme">Fora do Remessa Conforme (Alibaba…)</option>
                        </SelectField>
                      </label>
                      <label className={labelClassName}>
                        ICMS do estado
                        <SelectField
                          value={String(taxCalc.icmsRate)}
                          onChange={(v) => setTaxCalc((c) => ({ ...c, icmsRate: Number(v) }))}
                        >
                          {STATE_TAX_OPTIONS.map((opt) => (
                            <option key={opt.label} value={String(opt.rate)}>{opt.label}</option>
                          ))}
                        </SelectField>
                      </label>

                      {taxCalcResult ? (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                          <p className="mb-1.5 text-xs font-semibold text-amber-300">
                            Valor aduaneiro: U$ {taxCalcResult.customsValueUsd.toFixed(2)}
                          </p>
                          <div className="grid gap-0.5">
                            {taxCalcResult.breakdown.map((item) => (
                              <div key={item.label} className="flex justify-between text-xs">
                                <span className="text-zinc-400">{item.label}</span>
                                <span className="text-zinc-300">{formatCurrency(item.value)}</span>
                              </div>
                            ))}
                            <div className="mt-1 flex justify-between border-t border-zinc-700 pt-1 text-xs font-semibold">
                              <span className="text-amber-300">Total impostos</span>
                              <span className="text-amber-300">{formatCurrency(taxCalcResult.totalTaxBrl)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="mt-2 w-full rounded-lg bg-amber-500/20 px-2 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
                            onClick={() => updateLotForm("taxTotal", formatCurrency(taxCalcResult.totalTaxBrl))}
                          >
                            ↳ Usar este valor
                          </button>
                        </div>
                      ) : (
                        <p className="rounded-lg border border-zinc-700/50 px-2 py-1.5 text-xs text-zinc-500">
                          Preencha preço e cotação para calcular.
                        </p>
                      )}
                    </div>
                  )}

                  <label className={`${labelClassName} mt-2`}>
                    Impostos (BRL)
                    <input
                      className={inputClassName}
                      value={lotForm.taxTotal}
                      onChange={(e) => updateLotForm("taxTotal", e.target.value)}
                      placeholder="Auto ou manual"
                    />
                  </label>
                </div>

                {/* Fornecedor / Pedido / Data */}
                <div className="grid grid-cols-2 gap-2">
                  <label className={labelClassName}>Fornecedor<input className={inputClassName} placeholder="Ex: AliExpress / Alibaba" value={lotForm.supplierName} onChange={(e) => updateLotForm("supplierName", e.target.value)} /></label>
                  <label className={labelClassName}>Nº pedido<input className={inputClassName} placeholder="Ex: 8142637450" value={lotForm.supplierOrderCode} onChange={(e) => updateLotForm("supplierOrderCode", e.target.value)} /></label>
                </div>
                <label className={labelClassName}>Data da compra<input className={inputClassName} type="date" value={lotForm.purchasedAt} onChange={(e) => updateLotForm("purchasedAt", e.target.value)} /></label>

                {/* Preview */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Total do lote</span>
                    <span className="font-semibold text-zinc-100">{formatCurrency(lotPreview.totalLotCost)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-zinc-400">
                    <span>Custo unitário</span>
                    <span className="font-semibold text-emerald-300">{formatCurrency(lotPreview.unitCost)}</span>
                  </div>
                </div>

                <button className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-950" type="button" onClick={submitLot}>
                  {editingLotId ? "Atualizar lote" : "Cadastrar lote"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "pricing" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-100">Simulador de preço</h2>
          <CommerceSaleLikeFields
            lots={availableLots}
            products={products}
            values={simulatorForm}
            onChange={(field, value) => updateSimulatorForm(field as keyof typeof simulatorForm, value)}
            includeFeePercent
            horizontal
          />
          {(pricingSimulatorSchema.safeParse(simulatorForm).success && simulatorResult) && (
            <div className="mt-4 grid gap-3 border-t border-zinc-800 pt-4 md:grid-cols-3 xl:grid-cols-6">
              <Metric label="Receita bruta" value={formatCurrency(simulatorResult.grossRevenue)} />
              <Metric label="Custo total" value={formatCurrency(simulatorResult.totalCost)} />
              <Metric label="Lucro líquido" value={formatCurrency(simulatorResult.netProfit)} tone={simulatorResult.netProfit < 0 ? "bad" : "good"} />
              <Metric label="Margem" value={formatPercent(simulatorResult.profitMargin)} />
              <Metric label="Markup" value={simulatorResult.markup.toFixed(2)} />
              <Metric label="Preço mínimo" value={formatCurrency(minimumPrice)} />
            </div>
          )}
          {!pricingSimulatorSchema.safeParse(simulatorForm).success || !simulatorResult ? (
            <p className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-500">Preencha lote, preço e quantidade para simular.</p>
          ) : null}
        </div>
      )}

      {activeTab === "sales" && (
        <>
          {showSalesModal && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 pt-16">
              <div className="w-full max-w-5xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
                  <h2 className="text-sm font-semibold text-zinc-100">Vendas registradas</h2>
                  <button type="button" className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100" onClick={() => setShowSalesModal(false)}>✕ Fechar</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Marketplace</th>
                        <th className="px-4 py-3 text-right">Qtde</th>
                        <th className="px-4 py-3 text-right">Preço</th>
                        <th className="px-4 py-3 text-right">Lucro</th>
                        <th className="px-4 py-3 text-right">Margem</th>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-6 text-center text-xs text-zinc-500">Nenhuma venda registrada.</td></tr>
                      )}
                      {sales.slice().reverse().map((sale) => (
                        <tr key={sale.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                          <td className="px-4 py-3 text-zinc-200">{getProductName(sale.productId, products)}</td>
                          <td className="px-4 py-3 text-zinc-400 capitalize">{marketplaceOptions.find((m) => m.value === sale.marketplace)?.label || sale.marketplace}</td>
                          <td className="px-4 py-3 text-right text-zinc-300">{sale.quantity}</td>
                          <td className="px-4 py-3 text-right text-zinc-200">{formatCurrency(sale.salePrice)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${sale.netProfit < 0 ? "text-rose-300" : "text-emerald-300"}`}>{formatCurrency(sale.netProfit)}</td>
                          <td className="px-4 py-3 text-right text-zinc-400">{formatPercent(sale.profitMargin)}</td>
                          <td className="px-4 py-3 text-zinc-400">{sale.soldAt}</td>
                          <td className="px-4 py-3">
                            <button className="text-xs text-rose-300 hover:text-rose-100" type="button" onClick={() => removeSale(sale.id)}>Excluir</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Registrar venda</h2>
              <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100" onClick={() => setShowSalesModal(true)}>
                <ReceiptText size={14} />
                Ver vendas ({sales.length})
              </button>
            </div>
            <CommerceSaleLikeFields
              lots={availableLots}
              products={products}
              values={saleForm}
              onChange={(field, value) => updateSaleForm(field as keyof typeof saleForm, value)}
              selectedProductId={saleForm.productId}
              onProductChange={(value) => setSaleForm((current) => ({ ...current, productId: value, purchaseLotId: "" }))}
              horizontal
            />
            {selectedLotForSale && (
              <p className="mt-2 text-xs text-zinc-500">Lote com {selectedLotForSale.remainingQuantity} unidades disponíveis.</p>
            )}
            <button className="mt-4 w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-950" type="button" onClick={submitSale}>Registrar venda</button>
          </div>
        </>
      )}

      {activeTab === "stock" && (
        <>
          {showStockModal && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 pt-16">
              <div className="w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
                  <h2 className="text-sm font-semibold text-zinc-100">Estoque por lote</h2>
                  <button type="button" className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100" onClick={() => setShowStockModal(false)}>✕ Fechar</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Saldo</th>
                        <th className="px-4 py-3 text-right">Custo unit.</th>
                        <th className="px-4 py-3 text-right">Valor estoque</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseLots.map((lot) => (
                        <tr key={lot.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                          <td className="px-4 py-3 text-zinc-200">{getProductName(lot.productId, products)}</td>
                          <td className="px-4 py-3 text-zinc-400">{lot.purchasedAt}</td>
                          <td className="px-4 py-3 text-right text-zinc-400">{lot.quantity}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={lot.remainingQuantity === 0 ? "text-zinc-500" : "text-emerald-300"}>{lot.remainingQuantity}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(lot.unitCost)}</td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-300">{formatCurrency(getLotStockValue(lot))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {showMovementsModal && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 pt-16">
              <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
                  <h2 className="text-sm font-semibold text-zinc-100">Movimentações de estoque</h2>
                  <button type="button" className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100" onClick={() => setShowMovementsModal(false)}>✕ Fechar</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3 text-right">Qtde</th>
                        <th className="px-4 py-3">Motivo</th>
                        <th className="px-4 py-3">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockMovements.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-zinc-500">Nenhuma movimentação.</td></tr>
                      )}
                      {stockMovements.slice().reverse().map((movement) => (
                        <tr key={movement.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                          <td className="px-4 py-3 text-zinc-200">{getProductName(movement.productId, products)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs ${movement.type === "sale" || movement.type === "loss" || movement.type === "adjustment_out" ? "text-rose-300" : "text-emerald-300"}`}>
                              {movement.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-300">{movement.quantity}</td>
                          <td className="px-4 py-3 text-zinc-400">{movement.reason || "—"}</td>
                          <td className="px-4 py-3 text-zinc-400">{movement.createdAt?.slice(0, 10) || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">Ajuste de estoque</h2>
              <div className="flex gap-2">
                <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100" onClick={() => setShowStockModal(true)}>
                  <Warehouse size={14} />
                  Estoque por lote
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100" onClick={() => setShowMovementsModal(true)}>
                  <ClipboardList size={14} />
                  Movimentações ({stockMovements.length})
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
              <label className={labelClassName}>
                Lote
                <SelectField value={adjustmentForm.purchaseLotId} onChange={(value) => setAdjustmentForm((current) => ({ ...current, purchaseLotId: value }))}>
                  <option value="">Selecionar</option>
                  {purchaseLots.map((lot) => <option key={lot.id} value={lot.id}>{getProductName(lot.productId, products)} · {lot.remainingQuantity} un</option>)}
                </SelectField>
              </label>
              <label className={labelClassName}>
                Tipo
                <SelectField value={adjustmentForm.type} onChange={(value) => setAdjustmentForm((current) => ({ ...current, type: value as typeof adjustmentForm.type }))}>
                  <option value="adjustment_in">Ajuste positivo</option>
                  <option value="adjustment_out">Ajuste negativo</option>
                  <option value="loss">Perda</option>
                  <option value="return">Devolução</option>
                </SelectField>
              </label>
              <label className={labelClassName}>Quantidade<input className={inputClassName} type="number" min="1" placeholder="Ex: 2" value={adjustmentForm.quantity} onChange={(e) => setAdjustmentForm((current) => ({ ...current, quantity: e.target.value }))} /></label>
              <label className={labelClassName}>Motivo<input className={inputClassName} placeholder="Ex: Avaria no transporte" value={adjustmentForm.reason} onChange={(e) => setAdjustmentForm((current) => ({ ...current, reason: e.target.value }))} /></label>
              <button className="h-10 rounded-xl bg-emerald-500 px-4 text-sm font-medium text-zinc-950 whitespace-nowrap" type="button" onClick={submitAdjustment}>Registrar ajuste</button>
            </div>
          </div>
        </>
      )}

      {activeTab === "reports" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-100">Relatório por produto</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 text-right">Vendas</th>
                    <th className="px-4 py-3 text-right">Estoque</th>
                    <th className="px-4 py-3 text-right">Lucro</th>
                    <th className="px-4 py-3 text-right">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {productReports.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-zinc-500">Sem dados.</td></tr>
                  )}
                  {productReports.map((row) => (
                    <tr key={row.product.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                      <td className="px-4 py-3 text-zinc-200">{row.product.name}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{row.soldQuantity}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{row.stock}</td>
                      <td className={`px-4 py-3 text-right font-medium ${row.netProfit < 0 ? "text-rose-300" : "text-emerald-300"}`}>{formatCurrency(row.netProfit)}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{formatPercent(row.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-100">Relatório por marketplace</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3">Marketplace</th>
                    <th className="px-4 py-3 text-right">Pedidos</th>
                    <th className="px-4 py-3 text-right">Ticket médio</th>
                    <th className="px-4 py-3 text-right">Lucro</th>
                    <th className="px-4 py-3 text-right">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {marketplaceReports.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-zinc-500">Sem dados.</td></tr>
                  )}
                  {marketplaceReports.map((row) => (
                    <tr key={row.marketplace.value} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                      <td className="px-4 py-3 text-zinc-200">{row.marketplace.label}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{row.orders}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{formatCurrency(row.averageTicket)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${row.netProfit < 0 ? "text-rose-300" : "text-emerald-300"}`}>{formatCurrency(row.netProfit)}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{formatPercent(row.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 md:col-span-2">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-100">Produtos parados (com estoque)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 text-right">Estoque</th>
                    <th className="px-4 py-3 text-right">Custo médio</th>
                    <th className="px-4 py-3 text-right">Valor parado</th>
                    <th className="px-4 py-3">Última venda</th>
                    <th className="px-4 py-3 text-right">Dias parado</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.filter((row) => row.stock > 0).length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-zinc-500">Nenhum produto com estoque.</td></tr>
                  )}
                  {productRows.filter((row) => row.stock > 0).map((row) => {
                    const lastSale = lastSaleDate(row.product.id)
                    const daysIdle = lastSale
                      ? Math.floor((Date.now() - new Date(`${lastSale}T00:00:00`).getTime()) / 86_400_000)
                      : null
                    return (
                      <tr key={row.product.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 text-zinc-200">{row.product.name}</td>
                        <td className="px-4 py-3 text-right text-zinc-400">{row.stock}</td>
                        <td className="px-4 py-3 text-right text-zinc-400">{formatCurrency(row.averageCost)}</td>
                        <td className="px-4 py-3 text-right font-medium text-amber-300">{formatCurrency(row.stock * row.averageCost)}</td>
                        <td className="px-4 py-3 text-zinc-400">{lastSale || "Sem venda"}</td>
                        <td className={`px-4 py-3 text-right ${daysIdle !== null && daysIdle > 30 ? "text-rose-300" : "text-zinc-400"}`}>
                          {daysIdle === null ? "—" : `${daysIdle}d`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <p className={`mt-1 text-lg font-semibold ${tone === "bad" ? "text-rose-300" : tone === "good" ? "text-emerald-300" : "text-zinc-100"}`}>{value}</p>
    </div>
  )
}

function ListPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      <div className="mt-3 grid gap-2">{children}</div>
    </div>
  )
}

function Row({ left, right, action }: { left: string; right: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
      <span className="min-w-0 truncate text-zinc-200">{left}</span>
      <span className="shrink-0 text-right text-zinc-400">{right}</span>
      {action}
    </div>
  )
}

function CommerceSaleLikeFields({
  lots,
  products,
  values,
  onChange,
  includeFeePercent = false,
  selectedProductId,
  onProductChange,
  horizontal = false
}: {
  lots: PurchaseLot[]
  products: ReturnType<typeof useCommerceStore.getState>["products"]
  values: Record<string, string>
  onChange: (field: string, value: string) => void
  includeFeePercent?: boolean
  selectedProductId?: string
  onProductChange?: (value: string) => void
  horizontal?: boolean
}) {
  const filteredLots = getAvailableLots(lots, selectedProductId)

  if (horizontal) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Col 1 */}
        <div className="grid gap-3 content-start">
          {onProductChange && (
            <label className={labelClassName}>
              Produto
              <SelectField value={selectedProductId || ""} onChange={(value) => onProductChange(value)}>
                <option value="">Selecionar</option>
                {products.filter((p) => p.isActive).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </SelectField>
            </label>
          )}
          <label className={labelClassName}>
            Lote
            <SelectField value={values.purchaseLotId || ""} onChange={(value) => onChange("purchaseLotId", value)}>
              <option value="">Selecionar</option>
              {filteredLots.map((lot) => <option key={lot.id} value={lot.id}>{getProductName(lot.productId, products)} · {formatCurrency(lot.unitCost)} · {lot.remainingQuantity} un</option>)}
            </SelectField>
          </label>
          <label className={labelClassName}>
            Marketplace
            <SelectField value={values.marketplace || "mercado_livre"} onChange={(value) => onChange("marketplace", value)}>
              {marketplaceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
          </label>
        </div>

        {/* Col 2 */}
        <div className="grid gap-3 content-start">
          <div className="grid grid-cols-2 gap-2">
            <label className={labelClassName}>Quantidade<input className={inputClassName} type="number" min="1" placeholder="1" value={values.quantity || "1"} onChange={(e) => onChange("quantity", e.target.value)} /></label>
            <label className={labelClassName}>Preço venda<input className={inputClassName} placeholder="R$ 0,00" value={values.salePrice || ""} onChange={(e) => onChange("salePrice", e.target.value)} /></label>
          </div>
          {includeFeePercent ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelClassName}>Comissão %<input className={inputClassName} placeholder="Ex: 16" value={values.feePercent || ""} onChange={(e) => onChange("feePercent", e.target.value)} /></label>
                <label className={labelClassName}>Taxa fixa<input className={inputClassName} placeholder="R$ 0,00" value={values.fixedFee || ""} onChange={(e) => onChange("fixedFee", e.target.value)} /></label>
              </div>
              <label className={labelClassName}>Margem desejada %<input className={inputClassName} placeholder="Ex: 20" value={values.desiredMarginPercent || "20"} onChange={(e) => onChange("desiredMarginPercent", e.target.value)} /></label>
            </>
          ) : (
            <label className={labelClassName}>Taxa marketplace<input className={inputClassName} placeholder="R$ 0,00" value={values.marketplaceFee || ""} onChange={(e) => onChange("marketplaceFee", e.target.value)} /></label>
          )}
        </div>

        {/* Col 3 */}
        <div className="grid gap-3 content-start">
          <div className="grid grid-cols-3 gap-2">
            <label className={labelClassName}>Frete<input className={inputClassName} placeholder="R$ 0,00" value={values.shippingCost || ""} onChange={(e) => onChange("shippingCost", e.target.value)} /></label>
            <label className={labelClassName}>Embalagem<input className={inputClassName} placeholder="R$ 0,00" value={values.packagingCost || ""} onChange={(e) => onChange("packagingCost", e.target.value)} /></label>
            <label className={labelClassName}>Outros<input className={inputClassName} placeholder="R$ 0,00" value={values.otherCosts || ""} onChange={(e) => onChange("otherCosts", e.target.value)} /></label>
          </div>
          {!includeFeePercent && (
            <>
              <label className={labelClassName}>Data<input className={inputClassName} type="date" value={values.soldAt || today} onChange={(e) => onChange("soldAt", e.target.value)} /></label>
              <label className={labelClassName}>Observação<input className={inputClassName} placeholder="Observações sobre a venda" value={values.notes || ""} onChange={(e) => onChange("notes", e.target.value)} /></label>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 grid gap-3">
      {onProductChange && (
        <label className={labelClassName}>
          Produto
          <SelectField value={selectedProductId || ""} onChange={(value) => onProductChange(value)}>
            <option value="">Selecionar</option>
            {products.filter((p) => p.isActive).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </SelectField>
        </label>
      )}
      <label className={labelClassName}>
        Lote
        <SelectField value={values.purchaseLotId || ""} onChange={(value) => onChange("purchaseLotId", value)}>
          <option value="">Selecionar</option>
          {filteredLots.map((lot) => <option key={lot.id} value={lot.id}>{getProductName(lot.productId, products)} · {formatCurrency(lot.unitCost)} · {lot.remainingQuantity} un</option>)}
        </SelectField>
      </label>
      <label className={labelClassName}>
        Marketplace
        <SelectField value={values.marketplace || "mercado_livre"} onChange={(value) => onChange("marketplace", value)}>
          {marketplaceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectField>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={labelClassName}>Quantidade<input className={inputClassName} type="number" min="1" placeholder="1" value={values.quantity || "1"} onChange={(e) => onChange("quantity", e.target.value)} /></label>
        <label className={labelClassName}>Preço venda<input className={inputClassName} placeholder="R$ 0,00" value={values.salePrice || ""} onChange={(e) => onChange("salePrice", e.target.value)} /></label>
      </div>
      {includeFeePercent ? (
        <div className="grid grid-cols-2 gap-2">
          <label className={labelClassName}>Comissão %<input className={inputClassName} placeholder="Ex: 16" value={values.feePercent || ""} onChange={(e) => onChange("feePercent", e.target.value)} /></label>
          <label className={labelClassName}>Taxa fixa<input className={inputClassName} placeholder="R$ 0,00" value={values.fixedFee || ""} onChange={(e) => onChange("fixedFee", e.target.value)} /></label>
        </div>
      ) : (
        <label className={labelClassName}>Taxa marketplace<input className={inputClassName} placeholder="R$ 0,00" value={values.marketplaceFee || ""} onChange={(e) => onChange("marketplaceFee", e.target.value)} /></label>
      )}
      <div className="grid grid-cols-3 gap-2">
        <label className={labelClassName}>Frete<input className={inputClassName} placeholder="R$ 0,00" value={values.shippingCost || ""} onChange={(e) => onChange("shippingCost", e.target.value)} /></label>
        <label className={labelClassName}>Embalagem<input className={inputClassName} placeholder="R$ 0,00" value={values.packagingCost || ""} onChange={(e) => onChange("packagingCost", e.target.value)} /></label>
        <label className={labelClassName}>Outros<input className={inputClassName} placeholder="R$ 0,00" value={values.otherCosts || ""} onChange={(e) => onChange("otherCosts", e.target.value)} /></label>
      </div>
      {includeFeePercent ? (
        <label className={labelClassName}>Margem desejada %<input className={inputClassName} placeholder="Ex: 20" value={values.desiredMarginPercent || "20"} onChange={(e) => onChange("desiredMarginPercent", e.target.value)} /></label>
      ) : (
        <>
          <label className={labelClassName}>Data<input className={inputClassName} type="date" value={values.soldAt || today} onChange={(e) => onChange("soldAt", e.target.value)} /></label>
          <label className={labelClassName}>Observação<input className={inputClassName} placeholder="Observações sobre a venda" value={values.notes || ""} onChange={(e) => onChange("notes", e.target.value)} /></label>
        </>
      )}
    </div>
  )
}
