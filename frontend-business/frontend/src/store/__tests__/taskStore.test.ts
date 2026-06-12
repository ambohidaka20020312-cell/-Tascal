import { describe, it, expect, beforeEach } from 'vitest'
import { useTaskStore } from '../taskStore'
import type { Task } from '../taskStore'

const makeTask = (id: number, overrides: Partial<Task> = {}): Task => ({
  id,
  title: `タスク${id}`,
  description: '',
  priority: 'medium',
  status: 'pending',
  estimated_minutes: 30,
  actual_minutes: null,
  scheduled_date: '2026-06-02',
  due_datetime: null,
  sort_order: id,
  completed_at: null,
  created_at: '2026-06-02T00:00:00',
  ...overrides,
})

describe('taskStore', () => {
  beforeEach(() => {
    // ストアをリセット
    useTaskStore.setState({ tasks: [], selectedDate: new Date().toISOString().split('T')[0] })
  })

  it('setTasks でタスクが設定される', () => {
    const tasks = [makeTask(1), makeTask(2)]
    useTaskStore.getState().setTasks(tasks)
    expect(useTaskStore.getState().tasks).toEqual(tasks)
  })

  it('addTask でタスクが追加される', () => {
    const task = makeTask(1)
    useTaskStore.getState().addTask(task)
    expect(useTaskStore.getState().tasks).toHaveLength(1)
    expect(useTaskStore.getState().tasks[0]).toEqual(task)
  })

  it('addTask で既存タスクが保持されたまま追加される', () => {
    useTaskStore.getState().setTasks([makeTask(1)])
    useTaskStore.getState().addTask(makeTask(2))
    expect(useTaskStore.getState().tasks).toHaveLength(2)
  })

  it('updateTask で特定のタスクが更新される', () => {
    useTaskStore.getState().setTasks([makeTask(1), makeTask(2)])
    useTaskStore.getState().updateTask(1, { title: '更新済みタスク', status: 'completed' })
    const tasks = useTaskStore.getState().tasks
    expect(tasks[0].title).toBe('更新済みタスク')
    expect(tasks[0].status).toBe('completed')
    expect(tasks[1].title).toBe('タスク2') // 他のタスクは変わらない
  })

  it('removeTask でタスクが削除される', () => {
    useTaskStore.getState().setTasks([makeTask(1), makeTask(2), makeTask(3)])
    useTaskStore.getState().removeTask(2)
    const tasks = useTaskStore.getState().tasks
    expect(tasks).toHaveLength(2)
    expect(tasks.find(t => t.id === 2)).toBeUndefined()
  })

  it('setSelectedDate で日付が変わる', () => {
    useTaskStore.getState().setSelectedDate('2026-07-01')
    expect(useTaskStore.getState().selectedDate).toBe('2026-07-01')
  })
})
