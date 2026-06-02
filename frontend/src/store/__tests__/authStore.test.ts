import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../authStore'

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  plan: 'free' as const,
}

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null })
    localStorage.clear()
  })

  it('初期状態では user が null', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setUser でユーザーが設定される', () => {
    useAuthStore.getState().setUser(mockUser)
    expect(useAuthStore.getState().user).toEqual(mockUser)
  })

  it('logout で user が null になる', () => {
    useAuthStore.getState().setUser(mockUser)
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('logout で localStorage の access_token がクリアされる', () => {
    localStorage.setItem('access_token', 'some-token')
    useAuthStore.getState().logout()
    expect(localStorage.getItem('access_token')).toBeNull()
  })

  it('logout で localStorage の refresh_token がクリアされる', () => {
    localStorage.setItem('refresh_token', 'some-refresh-token')
    useAuthStore.getState().logout()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('isAuthenticated は user がいるとき true を返す', () => {
    useAuthStore.getState().setUser(mockUser)
    expect(useAuthStore.getState().isAuthenticated()).toBe(true)
  })

  it('isAuthenticated は user が null のとき false を返す', () => {
    useAuthStore.setState({ user: null })
    expect(useAuthStore.getState().isAuthenticated()).toBe(false)
  })
})
