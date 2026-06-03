import { offlineQueue } from '../utils/offlineQueue'

beforeEach(() => localStorage.clear())

describe('offlineQueue', () => {
  test('operationを追加できる', () => {
    offlineQueue.add({ method: 'POST', url: '/tasks', data: { title: 'test' } })
    expect(offlineQueue.getAll()).toHaveLength(1)
  })
  test('複数追加できる', () => {
    offlineQueue.add({ method: 'POST', url: '/tasks', data: {} })
    offlineQueue.add({ method: 'DELETE', url: '/tasks/1' })
    expect(offlineQueue.getAll()).toHaveLength(2)
  })
})
