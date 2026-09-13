import { screen, type Display, type Rectangle } from 'electron'

const WIDTH = 430
const MAX_HEIGHT = 760
const MIN_HEIGHT = 560
const PEEK = 12

export function activeDisplay(currentBounds?: Rectangle): Display {
  if (currentBounds) return screen.getDisplayMatching(currentBounds)
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
}

export function revealedBounds(display: Display, preferredY?: number): Rectangle {
  const area = display.workArea
  const height = Math.max(Math.min(MAX_HEIGHT, area.height - 24), Math.min(MIN_HEIGHT, area.height))
  const y = Math.min(Math.max(preferredY ?? area.y + Math.round((area.height - height) / 2), area.y), area.y + area.height - height)
  return { x: area.x + area.width - WIDTH, y, width: WIDTH, height }
}

export function peekBounds(display: Display, preferredY?: number): Rectangle {
  const bounds = revealedBounds(display, preferredY)
  return { ...bounds, x: display.workArea.x + display.workArea.width - PEEK }
}
