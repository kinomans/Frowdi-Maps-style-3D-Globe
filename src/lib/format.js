export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} м`
  return `${(meters / 1000).toFixed(meters < 10000 ? 2 : 1)} км`
}

export function formatDuration(seconds) {
  const totalMinutes = Math.round(seconds / 60)
  if (totalMinutes < 60) return `${totalMinutes} мин`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes ? `${hours} ч ${minutes} мин` : `${hours} ч`
}
