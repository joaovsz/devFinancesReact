export type BankAccountType = "checking" | "savings" | "investment"

export type BankAccount = {
  id: string
  name: string
  type: BankAccountType
  balance: number
}

