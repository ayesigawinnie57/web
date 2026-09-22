import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { BASE_URL } from './api'

const storage = {
  async get(key: string) {
    if (Platform.OS === 'web') return localStorage.getItem(key)
    return SecureStore.getItemAsync(key)
  },
  async set(key: string, value: string) {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return }
    return SecureStore.setItemAsync(key, value)
  },
  async del(key: string) {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return }
    return SecureStore.deleteItemAsync(key)
  },
}

export type AuthUser = {
  id: number
  email: string
  name: string
  phone: string
  avatar: string | null
  is_staff: boolean
  is_superuser: boolean
  country: string
  region: string
  district: string
  village: string
}

export const authApi = {
  login: (email: string, password: string) =>
    axios.post<{ access: string; refresh: string }>(`${BASE_URL}/api/auth/login/`, { email, password }, { headers: { 'ngrok-skip-browser-warning': 'true' } }),

  register: (name: string, email: string, phone: string, password: string, location: { country: string; region: string; district: string; village: string }) =>
    axios.post(`${BASE_URL}/api/auth/register/`, { name, email, phone, password, ...location }, { headers: { 'ngrok-skip-browser-warning': 'true' } }),

  profile: (token: string) =>
    axios.get<AuthUser>(`${BASE_URL}/api/auth/profile/`, {
      headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
    }),

  updateProfile: (token: string, data: FormData | Partial<Pick<AuthUser, 'name' | 'phone' | 'country' | 'region' | 'district' | 'village'>> | { current_password: string; new_password: string; password_confirm: string }) =>
    axios.patch<AuthUser>(`${BASE_URL}/api/auth/profile/`, data, {
      headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
    }),
}

export const tokenStore = {
  save: async (access: string, refresh: string) => {
    await storage.set('access_token', access)
    await storage.set('refresh_token', refresh)
  },
  clear: async () => {
    await storage.del('access_token')
    await storage.del('refresh_token')
  },
  getAccess: () => storage.get('access_token'),
  getRefresh: () => storage.get('refresh_token'),
}
