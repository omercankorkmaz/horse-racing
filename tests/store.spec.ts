
import { describe, it, expect } from 'vitest'
import { store } from '../src/store'

describe('store basics', () => {
  it('generates horses and schedule', () => {
    store.dispatch('generate')
    expect(store.state.horses).toHaveLength(20)
    expect(store.state.schedule).toHaveLength(6)
    for (const r of store.state.schedule) {
      expect(r.horses.length).toBe(10)
      expect([1200,1400,1600,1800,2000,2200]).toContain(r.distance)
    }
  })

  it('start puts state into running', () => {
    store.dispatch('generate')
    store.dispatch('start')
    expect(store.state.status).toBe('running')
  })
})
