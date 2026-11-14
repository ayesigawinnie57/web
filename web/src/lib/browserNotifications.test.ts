import { describe, expect, it } from 'vitest'
import { findNewUnreadNotifications } from './browserNotifications'
import type { ApiNotification } from './api'

function notification(id: number, read = false): ApiNotification {
  return {
    id,
    type: 'order',
    title: `Order ${id}`,
    body: 'An order was updated.',
    action_url: '/orders',
    read,
    created_at: '2026-11-14T09:00:00Z',
  }
}

describe('new Django notification detection', () => {
  it('does not announce existing notifications on initial load', () => {
    expect(findNewUnreadNotifications([notification(1)], null)).toEqual([])
  })

  it('announces only unread notifications not present in the previous fetch', () => {
    expect(findNewUnreadNotifications(
      [notification(3), notification(2, true), notification(1)],
      new Set([1]),
    )).toEqual([notification(3)])
  })
})
