export type Goal = {
  id: string
  name: string
  targetAmount: number
  currentSaved: number
  monthlyContribution: number
}

export type GoalInput = Omit<Goal, "id">
