import { Category } from "../types/finance"
import { Transaction } from "../types/transaction"

type UsageMap = Map<string, number>

function getUsageCount(usage: UsageMap, id: string) {
  return usage.get(id) || 0
}

function compareByUsageThenOriginalOrder(
  left: { id: string },
  right: { id: string },
  usage: UsageMap,
  originalOrder: Map<string, number>
) {
  const usageDiff = getUsageCount(usage, right.id) - getUsageCount(usage, left.id)
  if (usageDiff !== 0) {
    return usageDiff
  }

  return (originalOrder.get(left.id) || 0) - (originalOrder.get(right.id) || 0)
}

export function sortCategoriesByTransactionUsage(
  categories: Category[],
  transactions: Transaction[]
) {
  const categoryUsage = new Map<string, number>()
  const subcategoryUsage = new Map<string, number>()

  transactions.forEach((transaction) => {
    categoryUsage.set(
      transaction.categoryId,
      getUsageCount(categoryUsage, transaction.categoryId) + 1
    )
    subcategoryUsage.set(
      `${transaction.categoryId}:${transaction.subcategoryId}`,
      getUsageCount(subcategoryUsage, `${transaction.categoryId}:${transaction.subcategoryId}`) + 1
    )
  })

  const categoryOriginalOrder = new Map(
    categories.map((category, index) => [category.id, index])
  )

  return categories
    .map((category) => {
      const subcategoryOriginalOrder = new Map(
        category.subcategories.map((subcategory, index) => [subcategory.id, index])
      )
      const currentSubcategoryUsage = new Map(
        [...subcategoryUsage.entries()]
          .filter(([key]) => key.startsWith(`${category.id}:`))
          .map(([key, value]) => [key.slice(category.id.length + 1), value])
      )

      return {
        ...category,
        subcategories: [...category.subcategories].sort((left, right) =>
          compareByUsageThenOriginalOrder(
            left,
            right,
            currentSubcategoryUsage,
            subcategoryOriginalOrder
          )
        )
      }
    })
    .sort((left, right) =>
      compareByUsageThenOriginalOrder(left, right, categoryUsage, categoryOriginalOrder)
    )
}
