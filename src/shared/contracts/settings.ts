export interface AppSettings {
  hotkey: string
  autoHide: boolean
  pinned: boolean
  launchAtLogin: boolean
  theme: 'SYSTEM' | 'DARK' | 'LIGHT'
  selectedModel: 'deepseek-flash' | 'deepseek-v4-pro'
  rangeDays: 7 | 30
  balanceRefreshMinutes: number
  usageRefreshMinutes: number
}

export const defaultSettings: AppSettings = {
  hotkey: 'CommandOrControl+Alt+U',
  autoHide: true,
  pinned: false,
  launchAtLogin: false,
  theme: 'SYSTEM',
  selectedModel: 'deepseek-flash',
  rangeDays: 7,
  balanceRefreshMinutes: 5,
  usageRefreshMinutes: 2
}
