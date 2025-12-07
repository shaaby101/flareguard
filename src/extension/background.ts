type ChromeLike = {
  action?: {
    setBadgeText(details: { text: string }): void
    setBadgeBackgroundColor(details: { color: string }): void
  }
  alarms?: {
    clear(name: string, callback?: () => void): void
    create(name: string, options: { periodInMinutes: number }): void
    onAlarm: { addListener(cb: (alarm: { name: string }) => void): void }
  }
  runtime?: {
    onInstalled?: { addListener(cb: () => void): void }
  }
}

const POLL_ALARM = 'flareguard-risk-poll'

const chromeLike: ChromeLike | undefined =
  typeof globalThis !== 'undefined'
    ? (globalThis as typeof globalThis & { chrome?: ChromeLike }).chrome
    : undefined

function getBadgeColor(score: number) {
  if (score >= 75) return '#f87171'
  if (score <= 50) return '#34d399'
  return '#fbbf24'
}

function evaluateRiskScore(): number {
  return Math.round(40 + Math.random() * 40)
}

function updateBadge(score: number) {
  const badgeText = String(score)
  const badgeColor = getBadgeColor(score)
  chromeLike?.action?.setBadgeText({ text: badgeText })
  chromeLike?.action?.setBadgeBackgroundColor({ color: badgeColor })
}

function handleAlarm(alarm: { name: string }) {
  if (alarm.name !== POLL_ALARM) return
  const score = evaluateRiskScore()
  updateBadge(score)
}

function scheduleAlarm() {
  chromeLike?.alarms?.clear(POLL_ALARM, () => {
    chromeLike?.alarms?.create(POLL_ALARM, { periodInMinutes: 1 })
  })
}

if (chromeLike?.runtime?.onInstalled) {
  chromeLike.runtime.onInstalled.addListener(() => {
    scheduleAlarm()
    updateBadge(evaluateRiskScore())
  })
}

if (chromeLike?.alarms) {
  chromeLike.alarms.onAlarm.addListener(handleAlarm)
  scheduleAlarm()
  updateBadge(evaluateRiskScore())
}
