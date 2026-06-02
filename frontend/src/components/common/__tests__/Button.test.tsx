import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '../Button'

describe('Button', () => {
  describe('variant classes', () => {
    it('primary variant に正しいCSSクラスが付く', () => {
      render(<Button variant="primary">Click me</Button>)
      const btn = screen.getByRole('button')
      expect(btn).toHaveClass('bg-primary-500')
    })

    it('secondary variant に正しいCSSクラスが付く', () => {
      render(<Button variant="secondary">Click me</Button>)
      const btn = screen.getByRole('button')
      expect(btn).toHaveClass('bg-white', 'text-gray-700', 'border')
    })

    it('danger variant に正しいCSSクラスが付く', () => {
      render(<Button variant="danger">Click me</Button>)
      const btn = screen.getByRole('button')
      expect(btn).toHaveClass('bg-red-500')
    })

    it('variant未指定時はprimaryがデフォルト', () => {
      render(<Button>Click me</Button>)
      const btn = screen.getByRole('button')
      expect(btn).toHaveClass('bg-primary-500')
    })
  })

  describe('onClick', () => {
    it('クリックするとonClickが呼ばれる', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      await userEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('disabled', () => {
    it('disabled時にクリックできない', async () => {
      const handleClick = vi.fn()
      render(<Button disabled onClick={handleClick}>Click me</Button>)
      const btn = screen.getByRole('button')
      expect(btn).toBeDisabled()
      await userEvent.click(btn)
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('loading', () => {
    it('loading時にSVGスピナーが表示される', () => {
      render(<Button loading>Click me</Button>)
      const btn = screen.getByRole('button')
      expect(btn.querySelector('svg')).toBeInTheDocument()
    })

    it('loading時にボタンがdisabledになる', () => {
      render(<Button loading>Click me</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('loading時にクリックできない', async () => {
      const handleClick = vi.fn()
      render(<Button loading onClick={handleClick}>Click me</Button>)
      await userEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })
})
