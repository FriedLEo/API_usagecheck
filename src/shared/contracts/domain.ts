import { z } from 'zod'

export const decimalStringSchema = z.string().regex(/^(0|[1-9]\d*)(\.\d+)?$/)
export const billingDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const isoInstantSchema = z.iso.datetime({ offset: true })

export type DecimalString = z.infer<typeof decimalStringSchema>
export type BillingDate = z.infer<typeof billingDateSchema>

export const moneySchema = z.object({
  amount: decimalStringSchema,
  currency: z.string().trim().min(3).max(8)
})

export interface Money {
  amount: DecimalString
  currency: string
}

export const tokenBreakdownSchema = z.object({
  inputCacheHit: decimalStringSchema,
  inputCacheMiss: decimalStringSchema,
  output: decimalStringSchema
})

export interface TokenBreakdown {
  inputCacheHit: DecimalString
  inputCacheMiss: DecimalString
  output: DecimalString
}
