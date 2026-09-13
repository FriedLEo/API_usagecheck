import { z } from 'zod'
import type { ProviderBalance } from '../../../shared/contracts/provider'
import { TrackerError } from '../../../shared/contracts/errors'
import { officialBalanceSchema } from './response-schemas'

const BALANCE_URL = 'https://api.deepseek.com/user/balance'

export async function fetchOfficialBalance(apiKey: string, signal?: AbortSignal): Promise<ProviderBalance> {
  const response = await fetch(BALANCE_URL, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.any([AbortSignal.timeout(12_000), ...(signal ? [signal] : [])])
  }).catch((error: unknown) => {
    if (error instanceof TrackerError) throw error
    throw new TrackerError('NETWORK_ERROR', 'Could not reach the DeepSeek balance service.', true)
  })

  if (response.status === 401 || response.status === 403) throw new TrackerError('AUTHENTICATION_FAILED', 'The DeepSeek API key was rejected.')
  if (response.status === 402) throw new TrackerError('PAYMENT_REQUIRED', 'The DeepSeek account has no available credit.')
  if (response.status === 429) throw new TrackerError('RATE_LIMITED', 'DeepSeek is rate limiting balance checks.', true)
  if (!response.ok) throw new TrackerError('PROVIDER_UNAVAILABLE', `DeepSeek balance is unavailable (HTTP ${response.status}).`, true)

  const length = Number(response.headers.get('content-length') ?? 0)
  if (length > 1_000_000) throw new TrackerError('VALIDATION_FAILED', 'DeepSeek returned an unexpectedly large balance response.')

  try {
    const parsed = officialBalanceSchema.parse(await response.json())
    return {
      isAvailable: parsed.is_available,
      balances: parsed.balance_infos.map((balance) => ({
        amount: balance.total_balance,
        currency: balance.currency,
        granted: balance.granted_balance,
        toppedUp: balance.topped_up_balance
      })),
      fetchedAt: new Date().toISOString()
    }
  } catch (error) {
    if (error instanceof TrackerError) throw error
    if (error instanceof z.ZodError) throw new TrackerError('VALIDATION_FAILED', 'DeepSeek changed the balance response format.')
    throw new TrackerError('VALIDATION_FAILED', 'DeepSeek returned invalid balance data.')
  }
}
