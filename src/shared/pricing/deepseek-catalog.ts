import type { PricingRate } from '../contracts/dashboard'

export interface DeepSeekPricingModel {
  peak: PricingRate
  offPeak: PricingRate
}

// Reviewed against https://api-docs.deepseek.com/quick_start/pricing on 2026-09-12.
export const deepSeekPricingCatalog: Record<'deepseek-flash' | 'deepseek-v4-pro', DeepSeekPricingModel> = {
  'deepseek-flash': {
    offPeak: { cacheHitInput: '0.003', cacheMissInput: '0.025', output: '0.05', currency: 'USD', unit: 'PER_MILLION_TOKENS' },
    peak: { cacheHitInput: '0.006', cacheMissInput: '0.05', output: '0.1', currency: 'USD', unit: 'PER_MILLION_TOKENS' }
  },
  'deepseek-v4-pro': {
    offPeak: { cacheHitInput: '0.022', cacheMissInput: '0.22', output: '0.76', currency: 'USD', unit: 'PER_MILLION_TOKENS' },
    peak: { cacheHitInput: '0.044', cacheMissInput: '0.44', output: '1.52', currency: 'USD', unit: 'PER_MILLION_TOKENS' }
  }
}

export const DEEPSEEK_PRICING_SOURCE = 'https://api-docs.deepseek.com/quick_start/pricing'
export const DEEPSEEK_PRICING_REVIEWED_AT = '2026-09-12T00:00:00.000Z'
