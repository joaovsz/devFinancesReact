import { describe, expect, it } from "vitest"
import { TransactionStore } from "../store/useTransactionStore"
import { GoalStore } from "../store/useGoalStore"
import { buildAppStateSnapshots } from "./supabase-sync"

describe("supabase sync snapshots", () => {
  it("includes monthly paid planned items in the transaction snapshot", () => {
    const snapshots = buildAppStateSnapshots({
      transactionState: {
        bankAccounts: [],
        cards: [],
        transactions: [],
        fixedCosts: [],
        installmentPlans: [],
        paidPlannedItems: {
          "fixedCost:rent:2026-05": "2026-05-14"
        },
        contractConfig: {
          incomeMode: "pj",
          hourlyRate: 0,
          hoursPerWorkday: 8,
          cltNetSalary: 0,
          cltPaydayDate: "2026-05-14",
          pjPaydayDate: "2026-05-14",
          incomeStartMonth: "2026-05",
          localityState: "SP",
          localityCity: "Sao Paulo",
          useHolidayApi: true
        },
        projectionSettings: {
          projectedBalance: 0,
          projectedRevenue: 0
        },
        totalIncomes: 0,
        totalExpenses: 0,
        totalAmount: 0
      } as unknown as TransactionStore,
      goalState: {
        goals: []
      } as unknown as GoalStore
    })

    expect(snapshots.transactionStorage.state).toMatchObject({
      paidPlannedItems: {
        "fixedCost:rent:2026-05": "2026-05-14"
      }
    })
  })
})
