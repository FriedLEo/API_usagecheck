import { z } from 'zod'
import { decimalStringSchema } from '../../../shared/contracts/domain'
import { TrackerError } from '../../../shared/contracts/errors'

const scalarSchema = z.union([z.string(), z.number(), z.null()]).transform((value, context) => {
  const text = value === null ? '0' : String(value).trim()
  const parsed = decimalStringSchema.safeParse(text)
  if (!parsed.success) {
    context.addIssue({ code: 'custom', message: 'Expected a non-negative decimal value' })
    return z.NEVER
  }
  return parsed.data
})

const envelopeSchema = z.object({
  code: z.number().int().optional(),
  msg: z.string().optional(),
  data: z.object({
    biz_code: z.number().int().optional(),
    biz_msg: z.string().optional(),
    biz_data: z.unknown().optional()
  }).optional()
}).passthrough()

function unwrapBusinessData(input: unknown, label: string): unknown {
  const envelope = envelopeSchema.parse(input)
  const code = envelope.code ?? 0
  const businessCode = envelope.data?.biz_code ?? 0
  if ([40002, 40003].includes(code) || [40002, 40003].includes(businessCode)) {
    throw new TrackerError('AUTHENTICATION_FAILED', 'The DeepSeek Platform session has expired.')
  }
  if (code !== 0 || businessCode !== 0) {
    throw new TrackerError('PROVIDER_UNAVAILABLE', `${label} returned an application error.`, true)
  }
  if (envelope.data?.biz_data === undefined || envelope.data.biz_data === null) {
    throw new TrackerError('PRIVATE_API_CHANGED', `${label} no longer matches the expected format.`)
  }
  return envelope.data.biz_data
}

export const officialBalanceSchema = z.object({
  is_available: z.boolean(),
  balance_infos: z.array(z.object({
    currency: z.string().trim().min(1).max(8),
    total_balance: decimalStringSchema,
    granted_balance: decimalStringSchema,
    topped_up_balance: decimalStringSchema
  }).passthrough()).max(20)
}).passthrough()

const identitySchema = z.union([
  z.string(),
  z.object({ name: z.string().optional(), tracking_id: z.string().optional() }).passthrough()
]).optional()

const amountBusinessSchema = z.object({
  series: z.array(z.object({
    api_key: identitySchema,
    model: z.string().optional(),
    buckets: z.array(z.object({
      time: z.number().int(),
      usage: z.record(z.string(), scalarSchema).optional()
    }).passthrough()).max(10000).optional()
  }).passthrough()).max(1000).optional()
}).passthrough()

const costBusinessSchema = z.object({
  data: z.array(z.object({
    currency: z.string().optional(),
    series: z.array(z.object({
      api_key: identitySchema,
      model: z.string().optional(),
      buckets: z.array(z.object({
        time: z.number().int(),
        cost: scalarSchema
      }).passthrough()).max(10000).optional()
    }).passthrough()).max(1000).optional()
  }).passthrough()).max(20).optional()
}).passthrough()

export type AmountBusiness = z.infer<typeof amountBusinessSchema>
export type CostBusiness = z.infer<typeof costBusinessSchema>

export function parseByKeyAmount(input: unknown): AmountBusiness {
  return amountBusinessSchema.parse(unwrapBusinessData(input, 'DeepSeek usage'))
}

export function parseByKeyCost(input: unknown): CostBusiness {
  return costBusinessSchema.parse(unwrapBusinessData(input, 'DeepSeek cost'))
}
