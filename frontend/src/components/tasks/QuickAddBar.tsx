import { useState } from 'react'
import { taskApi } from '../../utils/api'
import { useTaskStore } from '../../store/taskStore'
import { parseNaturalLanguageTask } from '../../utils/nlpTaskParser'
import { useSpeechInput } from '../../hooks/useSpeechInput'
import type { Task } from '../../store/taskStore'

const PRIORITY_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '緊急',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-600',
}

export default function QuickAddBar() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const { addTask, selectedDate } = useTaskStore()

  const parsed = input.trim() ? parseNaturalLanguageTask(input) : null

  const handleResult = (text: string) => {
    setInput(text)
  }

  const { isSupported, isListening, start, stop } = useSpeechInput(handleResult)

  const handleSubmit = async () => {
    if (!input.trim() || loading) return
    const p = parseNaturalLanguageTask(input)
    const payload = {
      title: p.title || input.trim(),
      description: '',
      priority: p.priority ?? 'medium',
      estimated_minutes: p.estimated_minutes ?? null,
      scheduled_date: p.scheduled_date ?? selectedDate,
      due_datetime: p.due_datetime ?? null,
    }
    setLoading(true)
    try {
      const res = await taskApi.create(payload)
      const task: Task = res.data.data ?? res.data
      addTask(task)
      setInput('')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition">
        {isSupported && (
          <button
            type="button"
            onClick={isListening ? stop : start}
            className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition ${
              isListening
                ? 'bg-red-100 text-red-600 animate-pulse'
                : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
            }`}
            aria-label={isListening ? '音声入力停止' : '音声入力開始'}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21h2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
            </svg>
          </button>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="「明日15時までに資料30分」と入力..."
          className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400 text-gray-800"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
          className="shrink-0 px-3 py-1 text-sm font-medium bg-primary-600 text-white rounded-lg disabled:opacity-40 hover:bg-primary-700 transition"
        >
          {loading ? '追加中...' : '追加'}
        </button>
      </div>

      {parsed && parsed.title && (
        <div className="flex items-center gap-3 px-1 text-xs text-gray-500 flex-wrap">
          {parsed.scheduled_date && (
            <span className="flex items-center gap-0.5">
              <span>📅</span>
              <span>{parsed.scheduled_date}</span>
            </span>
          )}
          {parsed.due_datetime && (
            <span className="flex items-center gap-0.5">
              <span>🕐</span>
              <span>{parsed.due_datetime.replace('T', ' ').slice(0, 16)}</span>
            </span>
          )}
          {parsed.estimated_minutes && (
            <span className="flex items-center gap-0.5">
              <span>⏱</span>
              <span>
                {parsed.estimated_minutes >= 60
                  ? `${Math.floor(parsed.estimated_minutes / 60)}時間${parsed.estimated_minutes % 60 > 0 ? `${parsed.estimated_minutes % 60}分` : ''}`
                  : `${parsed.estimated_minutes}分`}
              </span>
            </span>
          )}
          {parsed.priority && (
            <span className={`flex items-center gap-0.5 font-medium ${PRIORITY_COLORS[parsed.priority]}`}>
              <span>{parsed.priority === 'urgent' ? '🔴' : parsed.priority === 'high' ? '🟠' : parsed.priority === 'medium' ? '🔵' : '⚪'}</span>
              <span>{PRIORITY_LABELS[parsed.priority]}</span>
            </span>
          )}
          <span className="text-gray-700 font-medium">→ "{parsed.title}"</span>
        </div>
      )}
    </div>
  )
}
