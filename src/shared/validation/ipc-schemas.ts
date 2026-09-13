import { z } from 'zod'

export const rangeDaysSchema = z.union([z.literal(7), z.literal(30)]).optional()
export const credentialInputSchema = z.object({
  kind: z.enum(['API_KEY', 'PLATFORM_TOKEN', 'ZEN_API_KEY']),
  secret: z.string().trim().min(8).max(8192),
  persist: z.boolean()
})
export const credentialKindSchema = z.enum(['API_KEY', 'PLATFORM_TOKEN', 'ZEN_API_KEY'])
export const windowActionSchema = z.enum(['HIDE', 'PIN', 'UNPIN', 'POINTER_ENTER', 'POINTER_LEAVE'])
export const settingsPatchSchema = z.object({
  hotkey: z.string().min(3).max(80).optional(),
  autoHide: z.boolean().optional(),
  pinned: z.boolean().optional(),
  launchAtLogin: z.boolean().optional(),
  theme: z.enum(['SYSTEM', 'DARK', 'LIGHT']).optional(),
  selectedModel: z.enum(['deepseek-flash', 'deepseek-v4-pro']).optional(),
  rangeDays: z.union([z.literal(7), z.literal(30)]).optional(),
  balanceRefreshMinutes: z.number().int().min(1).max(60).optional(),
  usageRefreshMinutes: z.number().int().min(1).max(60).optional()
}).strict()
