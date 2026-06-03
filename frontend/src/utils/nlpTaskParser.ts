export interface ParsedTask {
  title: string
  estimated_minutes?: number
  scheduled_date?: string
  due_datetime?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function addDaysToDate(base: Date, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const WEEKDAY_MAP: Record<string, number> = {
  '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6, '日': 0,
}

export function parseNaturalLanguageTask(input: string): ParsedTask {
  let text = input.trim()
  let estimated_minutes: number | undefined
  let scheduled_date: string | undefined
  let due_datetime: string | undefined
  let priority: ParsedTask['priority'] | undefined

  const timePatterns: [RegExp, (m: RegExpMatchArray) => number][] = [
    [/(\d+)時間(\d+)分/, (m) => parseInt(m[1]) * 60 + parseInt(m[2])],
    [/(\d+)時間/, (m) => parseInt(m[1]) * 60],
    [/(\d+)分/, (m) => parseInt(m[1])],
    [/(\d+)h(\d+)m/, (m) => parseInt(m[1]) * 60 + parseInt(m[2])],
    [/(\d+)h/, (m) => parseInt(m[1]) * 60],
    [/(\d+)m(?![\d月])/, (m) => parseInt(m[1])],
  ]

  for (const [pattern, calc] of timePatterns) {
    const match = text.match(pattern)
    if (match) {
      estimated_minutes = calc(match)
      text = text.replace(match[0], ' ')
      break
    }
  }

  if (/今日/.test(text)) {
    scheduled_date = getToday()
    text = text.replace('今日', ' ')
  } else if (/明後日/.test(text)) {
    scheduled_date = addDaysToDate(new Date(), 2)
    text = text.replace('明後日', ' ')
  } else if (/明日/.test(text)) {
    scheduled_date = addDaysToDate(new Date(), 1)
    text = text.replace('明日', ' ')
  } else {
    const nextWeekMatch = text.match(/来週([月火水木金土日])曜/)
    if (nextWeekMatch) {
      const weekday = WEEKDAY_MAP[nextWeekMatch[1]]
      const today = new Date()
      const current = today.getDay()
      let diff = weekday - current
      if (diff <= 0) diff += 7
      diff += 7
      scheduled_date = addDaysToDate(today, diff)
      text = text.replace(nextWeekMatch[0], ' ')
    } else {
      const weekdayMatch = text.match(/([月火水木金土日])曜/)
      if (weekdayMatch) {
        const weekday = WEEKDAY_MAP[weekdayMatch[1]]
        const today = new Date()
        const current = today.getDay()
        let diff = weekday - current
        if (diff <= 0) diff += 7
        scheduled_date = addDaysToDate(today, diff)
        text = text.replace(weekdayMatch[0], ' ')
      } else {
        const mdMatch = text.match(/(\d{1,2})月(\d{1,2})日/)
        if (mdMatch) {
          const year = new Date().getFullYear()
          const month = parseInt(mdMatch[1]).toString().padStart(2, '0')
          const day = parseInt(mdMatch[2]).toString().padStart(2, '0')
          scheduled_date = `${year}-${month}-${day}`
          text = text.replace(mdMatch[0], ' ')
        }
      }
    }
  }

  const clockMatch = text.match(/(\d{1,2}):(\d{2})/)
  if (clockMatch) {
    const baseDate = scheduled_date ?? getToday()
    due_datetime = `${baseDate}T${clockMatch[1].padStart(2, '0')}:${clockMatch[2]}:00`
    text = text.replace(clockMatch[0], ' ')
  } else {
    const hourMatch = text.match(/(\d{1,2})時(?!間)/)
    if (hourMatch) {
      const baseDate = scheduled_date ?? getToday()
      due_datetime = `${baseDate}T${hourMatch[1].padStart(2, '0')}:00:00`
      text = text.replace(hourMatch[0], ' ')
    }
  }

  text = text.replace(/まで[にの]?/, ' ')

  if (/急ぎ|緊急|urgent/i.test(text)) {
    priority = 'urgent'
    text = text.replace(/急ぎ|緊急|urgent/gi, ' ')
  } else if (/高優先度|重要|high/i.test(text)) {
    priority = 'high'
    text = text.replace(/高優先度|重要|high/gi, ' ')
  } else if (/低優先度|low/i.test(text)) {
    priority = 'low'
    text = text.replace(/低優先度|low/gi, ' ')
  } else {
    priority = 'medium'
  }

  const title = text.replace(/\s+/g, ' ').trim()

  const result: ParsedTask = { title: title || input.trim() }
  if (estimated_minutes !== undefined) result.estimated_minutes = estimated_minutes
  if (scheduled_date) result.scheduled_date = scheduled_date
  if (due_datetime) result.due_datetime = due_datetime
  if (priority) result.priority = priority

  return result
}
