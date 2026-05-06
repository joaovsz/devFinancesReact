import { useEffect, useMemo, useState } from "react"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { Goal, GoalInput } from "../types/goal"
import { fetchBrazilHolidaysByYear, Holiday } from "../services/calendar"
import {
  getCurrentMonthKey,
  getExpectedIncomeForMonth,
  getOperationalCostsForMonth
} from "../utils/projections"
import { useTransactionStore } from "./useTransactionStore"

export type GoalStore = {
  goals: Goal[]
  addGoal: (goal: GoalInput) => void
  updateGoal: (goal: Goal) => void
  deleteGoal: (id: string) => void
  updateSavedAmount: (id: string, currentSaved: number) => void
  loadMockGoals: () => void
  clearGoals: () => void
}

export type GoalCashflowStatus = {
  projectedMonthlyLeftover: number
  totalMonthlyContribution: number
  remainingCashAfterGoals: number
  isOverloaded: boolean
}

function sanitizeMoneyValue(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(value, 0)
}

function normalizeGoal(goal: Goal) {
  return {
    ...goal,
    name: goal.name.trim(),
    targetAmount: sanitizeMoneyValue(goal.targetAmount),
    currentSaved: sanitizeMoneyValue(goal.currentSaved),
    monthlyContribution: sanitizeMoneyValue(goal.monthlyContribution)
  }
}

function createGoalFromInput(goal: GoalInput): Goal {
  return normalizeGoal({
    ...goal,
    id: crypto.randomUUID()
  })
}

function createMockGoals(): Goal[] {
  return [
    {
      id: "mock-goal-reserva",
      name: "Reserva de emergência",
      targetAmount: 25000,
      currentSaved: 9200,
      monthlyContribution: 1200
    },
    {
      id: "mock-goal-viagem",
      name: "Viagem internacional",
      targetAmount: 12000,
      currentSaved: 3200,
      monthlyContribution: 850
    },
    {
      id: "mock-goal-setup",
      name: "Upgrade setup home-office",
      targetAmount: 6000,
      currentSaved: 1400,
      monthlyContribution: 500
    }
  ]
}

export const useGoalStore = create<GoalStore>()(
  persist(
    (set) => ({
      goals: [],
      addGoal: (goalInput) =>
        set((state) => ({
          goals: [...state.goals, createGoalFromInput(goalInput)]
        })),
      updateGoal: (goal) =>
        set((state) => ({
          goals: state.goals.map((currentGoal) =>
            currentGoal.id === goal.id ? normalizeGoal(goal) : currentGoal
          )
        })),
      deleteGoal: (id) =>
        set((state) => ({
          goals: state.goals.filter((goal) => goal.id !== id)
        })),
      updateSavedAmount: (id, currentSaved) =>
        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === id
              ? {
                  ...goal,
                  currentSaved: sanitizeMoneyValue(currentSaved)
                }
              : goal
          )
        })),
      loadMockGoals: () =>
        set(() => ({
          goals: createMockGoals().map(normalizeGoal)
        })),
      clearGoals: () =>
        set(() => ({
          goals: []
        }))
    }),
    {
      name: "devfinances-goals-storage",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState as GoalStore
        }

        const state = persistedState as GoalStore
        return {
          ...state,
          goals: Array.isArray(state.goals) ? state.goals.map(normalizeGoal) : []
        }
      }
    }
  )
)

export const selectTotalMonthlyContribution = (state: GoalStore) =>
  state.goals.reduce((total, goal) => total + goal.monthlyContribution, 0)

export const selectTotalGoalsTarget = (state: GoalStore) =>
  state.goals.reduce((total, goal) => total + goal.targetAmount, 0)

export const selectTotalGoalsSaved = (state: GoalStore) =>
  state.goals.reduce((total, goal) => total + goal.currentSaved, 0)

export function useGoalCashflowStatus(): GoalCashflowStatus {
  const cards = useTransactionStore((state) => state.cards)
  const transactions = useTransactionStore((state) => state.transactions)
  const fixedCosts = useTransactionStore((state) => state.fixedCosts)
  const installmentPlans = useTransactionStore((state) => state.installmentPlans)
  const contractConfig = useTransactionStore((state) => state.contractConfig)
  const totalMonthlyContribution = useGoalStore(selectTotalMonthlyContribution)
  const [holidaysForMonth, setHolidaysForMonth] = useState<Holiday[]>([])
  const currentMonthKey = getCurrentMonthKey()

  useEffect(() => {
    let ignore = false

    if (!(contractConfig.incomeMode === "pj" && contractConfig.useHolidayApi)) {
      setHolidaysForMonth([])
      return () => {
        ignore = true
      }
    }

    const year = Number(currentMonthKey.split("-")[0])

    fetchBrazilHolidaysByYear(year)
      .then((holidays) => {
        if (ignore) {
          return
        }

        setHolidaysForMonth(
          holidays.filter((holiday) => holiday.date.startsWith(currentMonthKey))
        )
      })
      .catch(() => {
        if (!ignore) {
          setHolidaysForMonth([])
        }
      })

    return () => {
      ignore = true
    }
  }, [contractConfig.incomeMode, contractConfig.useHolidayApi, currentMonthKey])

  const projectedRevenue = useMemo(
    () =>
      getExpectedIncomeForMonth({
        contractConfig,
        transactions,
        monthKey: currentMonthKey,
        holidays: holidaysForMonth
      }),
    [
      contractConfig.cltPaydayDate,
      contractConfig.cltNetSalary,
      contractConfig.cltCompetenceOffsetMonths,
      contractConfig.hourlyRate,
      contractConfig.hoursPerWorkday,
      contractConfig.incomeMode,
      contractConfig.pjPaydayDate,
      contractConfig.pjCompetenceOffsetMonths,
      transactions,
      holidaysForMonth,
      currentMonthKey
    ]
  )

  const committedCosts = useMemo(
    () =>
      getOperationalCostsForMonth({
        cards,
        transactions,
        fixedCosts,
        installmentPlans,
        monthKey: currentMonthKey
      }).total,
    [cards, transactions, fixedCosts, installmentPlans, currentMonthKey]
  )

  const projectedMonthlyLeftover = projectedRevenue - committedCosts
  const remainingCashAfterGoals = projectedMonthlyLeftover - totalMonthlyContribution

  return {
    projectedMonthlyLeftover,
    totalMonthlyContribution,
    remainingCashAfterGoals,
    isOverloaded: remainingCashAfterGoals < 0
  }
}
