import { renderHook, act } from '@testing-library/react'
import { useSettingsStore } from '../store/settingsStore'

beforeEach(() => {
  useSettingsStore.setState({
    theme: 'system',
    accentColor: 'blue',
    pomodoroDuration: 25,
    pomodoroBreakDuration: 5,
  })
})

describe('settingsStore', () => {
  test('テーマを変更できる', () => {
    const { result } = renderHook(() => useSettingsStore())
    act(() => result.current.setTheme('dark'))
    expect(result.current.theme).toBe('dark')
  })
  test('ポモドーロ時間を変更できる', () => {
    const { result } = renderHook(() => useSettingsStore())
    act(() => result.current.setPomodoroSettings({ pomodoroDuration: 45 }))
    expect(result.current.pomodoroDuration).toBe(45)
  })
})
