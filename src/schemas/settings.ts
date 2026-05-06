import { z } from "zod"

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")

export const contractConfigSchema = z.object({
  incomeMode: z.enum(["pj", "clt"]),
  hourlyRate: z.number().nonnegative(),
  hoursPerWorkday: z.number().nonnegative(),
  cltNetSalary: z.number().nonnegative(),
  cltPaydayDate: isoDateSchema,
  pjPaydayDate: isoDateSchema,
  incomeStartMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  cltCompetenceOffsetMonths: z.number().int().min(0).max(12).optional(),
  pjCompetenceOffsetMonths: z.number().int().min(0).max(12).optional(),
  localityState: z.string().trim().min(1),
  localityCity: z.string().trim().min(1),
  useHolidayApi: z.boolean()
})

export const projectionSettingsSchema = z.object({
  projectedBalance: z.number().finite(),
  projectedRevenue: z.number().finite()
})
