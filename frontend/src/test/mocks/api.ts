import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { Task } from '../../store/taskStore'

const mockTasks: Task[] = [
  {
    id: 1,
    title: 'テストタスク1',
    description: 'テスト用タスクです',
    priority: 'high',
    status: 'pending',
    estimated_minutes: 60,
    actual_minutes: null,
    scheduled_date: '2026-06-02',
    due_datetime: null,
    sort_order: 0,
    completed_at: null,
    created_at: '2026-06-02T00:00:00',
  },
  {
    id: 2,
    title: 'テストタスク2',
    description: '',
    priority: 'medium',
    status: 'in_progress',
    estimated_minutes: 30,
    actual_minutes: null,
    scheduled_date: '2026-06-02',
    due_datetime: null,
    sort_order: 1,
    completed_at: null,
    created_at: '2026-06-02T01:00:00',
  },
]

export const handlers = [
  http.get('/api/v1/tasks', () => {
    return HttpResponse.json({ data: mockTasks })
  }),

  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    if (body.email === 'test@example.com' && body.password === 'pass1234') {
      return HttpResponse.json({
        data: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          user: {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            plan: 'free',
          },
        },
        message: 'ログインしました',
      })
    }
    return HttpResponse.json(
      { error: { code: 'INVALID_CREDENTIALS', message: 'メールアドレスまたはパスワードが正しくありません' } },
      { status: 401 }
    )
  }),
]

export const server = setupServer(...handlers)
