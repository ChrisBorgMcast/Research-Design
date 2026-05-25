const STORAGE_KEY = 'booking-submissions'

export function detectDeviceType() {
  if (typeof navigator === 'undefined') return 'pc/laptop'

  const userAgent = navigator.userAgent || ''
  const mobilePattern = /Android|iPhone|iPad|iPod|Mobi|Mobile/i
  const touchCapable = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)')?.matches

  return mobilePattern.test(userAgent) || touchCapable ? 'mobile' : 'pc/laptop'
}

export function formatElapsedTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0))
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0')
  const seconds = String(safeSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function queueBookingSubmission({ formType, elapsedSeconds, deviceType }) {
  const record = {
    id: buildSubmissionId(),
    formType,
    deviceType,
    submittedAt: new Date().toISOString(),
    elapsedSeconds: Math.max(0, Math.floor(elapsedSeconds || 0)),
    elapsedLabel: formatElapsedTime(elapsedSeconds),
  }

  const existing = readQueuedBookings()
  existing.unshift(record)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 50)))

  return record
}

function readQueuedBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function buildSubmissionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}