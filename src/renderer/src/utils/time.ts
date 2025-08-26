/**
 * 将秒数格式化为时钟格式 (e.g., 01:05:33 or 05:33).
 * @param totalSeconds 总秒数.
 * @returns 格式化后的时间字符串.
 */
export function formatSecondsToClock(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return '00:00'
  }
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  const formattedMinutes = String(minutes).padStart(2, '0')
  const formattedSeconds = String(seconds).padStart(2, '0')

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${formattedMinutes}:${formattedSeconds}`
  }
  return `${formattedMinutes}:${formattedSeconds}`
}

/**
 * 将秒数格式化为易于阅读的中文时长.
 * @param totalSeconds 总秒数.
 * @param style 'full' (e.g., 1时5分30秒) or 'short' (e.g., 1小时5分钟).
 * @returns 格式化后的时间字符串.
 */
export function formatSecondsToHuman(totalSeconds: number, style: 'full' | 'short' = 'full'): string {
  if (style === 'short') {
    if (totalSeconds <= 0) return '0 分钟'
    if (totalSeconds < 60) return '不到 1 分钟'
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.round((totalSeconds % 3600) / 60)
    const parts: string[] = []
    if (h > 0) parts.push(`${h} 小时`)
    if (m > 0) parts.push(`${m} 分钟`)
    return parts.join(' ')
  }

  // 完整模式
  if (totalSeconds <= 0) return '-'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  const parts: string[] = []
  if (h > 0) parts.push(`${h}时`)
  if (m > 0) parts.push(`${m}分`)
  if (s > 0) parts.push(`${s}秒`)
  return parts.join('') || '-'
}
