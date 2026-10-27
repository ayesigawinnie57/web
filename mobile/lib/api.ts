import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const DEFAULT_API_URL = 'https://web-production-b3675.up.railway.app'
export const BASE_URL = (process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL).replace(/\/+$/, '')

export const PRODUCT_SHARE_URL = `${BASE_URL}/api/products/share/products`

const getToken = (key: string) =>
  Platform.OS === 'web' ? Promise.resolve(localStorage.getItem(key)) : SecureStore.getItemAsync(key)

const setToken = (key: string, val: string) =>
  Platform.OS === 'web' ? Promise.resolve(localStorage.setItem(key, val)) : SecureStore.setItemAsync(key, val)

const delToken = (key: string) =>
  Platform.OS === 'web' ? Promise.resolve(localStorage.removeItem(key)) : SecureStore.deleteItemAsync(key)

const api = axios.create({
  baseURL: BASE_URL,
})

api.interceptors.request.use(async (config) => {
  const token = await getToken('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = await getToken('refresh_token')
        const { data } = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, { refresh })
        await setToken('access_token', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        await delToken('access_token')
        await delToken('refresh_token')
      }
    }
    return Promise.reject(error)
  }
)

export default api

export type SupportMessage = {
  id: number
  conversation_id: number
  sender_id: number
  sender_name: string
  is_staff: boolean
  body: string
  encryption_version: number | null
  is_read: boolean
  created_at: string
}

export type SupportEncryptionKey = {
  key_id: string
  device_id: string
  user_id: number
  is_staff: boolean
  public_key: string
  created_at: string
}

export type SupportEncryptedEnvelope = {
  version: 1
  sender_key_id: string
  recipients: { key_id: string; nonce: string; ciphertext: string }[]
}

export type SupportKeyBackup = {
  version: 1
  kdf: 'PBKDF2-SHA256'
  iterations: 600000
  device_id: string
  salt: string
  ciphertext: string
}

export const supportChatApi = {
  customerChat: (markRead = false) =>
    api.get<{ conversation_id: number | null; messages: SupportMessage[]; unread_count: number; staff_typing: boolean }>(
      `/api/auth/support/chat/${markRead ? '?mark_read=true' : ''}`,
    ),
  startCustomerChat: () => api.post<{ conversation_id: number }>('/api/auth/support/chat/', { start: true }),
  sendCustomerMessage: (envelope: SupportEncryptedEnvelope) => api.post<SupportMessage>('/api/auth/support/chat/', { envelope }),
  adminConversations: () => api.get<any[]>('/api/auth/admin/support/conversations/'),
  adminConversation: (id: number) => api.get<any>(`/api/auth/admin/support/conversations/${id}/`),
  sendAdminReply: (id: number, envelope: SupportEncryptedEnvelope) => api.post<SupportMessage>(`/api/auth/admin/support/conversations/${id}/`, { envelope }),
  encryptionKeys: (userId?: number) =>
    api.get<{ keys: SupportEncryptionKey[] }>(`/api/auth/support/encryption-keys/${userId ? `?user_id=${userId}` : ''}`),
  registerEncryptionKey: (device_id: string, public_key: string) =>
    api.post<SupportEncryptionKey>('/api/auth/support/encryption-keys/', { device_id, public_key }),
  revokeEncryptionKey: (device_id: string) =>
    api.delete('/api/auth/support/encryption-keys/', { data: { device_id } }),
  getKeyBackup: () => api.get<{ backup: SupportKeyBackup | null }>('/api/auth/support/encryption-backup/'),
  saveKeyBackup: (backup: SupportKeyBackup) => api.put('/api/auth/support/encryption-backup/', { backup }),
}
