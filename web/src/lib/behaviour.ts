// Tracks user behaviour: product views, clicks, category interest
// Persists locally (localStorage) for guests; syncs to backend for logged-in users

import { behaviourApi } from './api'

const BEHAVIOUR_KEY = 'majo_behaviour'
const MAX_HISTORY = 60

type BehaviourStore = {
  categoryScores: Record<string, number>
  recentProductIds: number[]
}

function load(): BehaviourStore {
  try {
    return JSON.parse(localStorage.getItem(BEHAVIOUR_KEY) ?? 'null') ?? { categoryScores: {}, recentProductIds: [] }
  } catch {
    return { categoryScores: {}, recentProductIds: [] }
  }
}

function save(store: BehaviourStore) {
  try { localStorage.setItem(BEHAVIOUR_KEY, JSON.stringify(store)) } catch { /* ignore */ }
}

export function trackProductView(productId: number, categorySlug: string) {
  const store = load()
  store.categoryScores[categorySlug] = (store.categoryScores[categorySlug] ?? 0) + 1
  store.recentProductIds = [productId, ...store.recentProductIds.filter(id => id !== productId)].slice(0, MAX_HISTORY)
  save(store)
  behaviourApi.track('view', categorySlug, productId)
}

export function trackProductClick(productId: number, categorySlug: string) {
  const store = load()
  store.categoryScores[categorySlug] = (store.categoryScores[categorySlug] ?? 0) + 3
  store.recentProductIds = [productId, ...store.recentProductIds.filter(id => id !== productId)].slice(0, MAX_HISTORY)
  save(store)
  behaviourApi.track('click', categorySlug, productId)
}

export function trackCategoryVisit(categorySlug: string) {
  const store = load()
  store.categoryScores[categorySlug] = (store.categoryScores[categorySlug] ?? 0) + 5
  save(store)
  behaviourApi.track('category', categorySlug)
}

export function getRankedCategories(): string[] {
  const { categoryScores } = load()
  return Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug)
}

export function getRecentProductIds(): number[] {
  return load().recentProductIds
}
