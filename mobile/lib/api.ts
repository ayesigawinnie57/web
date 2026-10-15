import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

export const BASE_URL = 'https://web-production-b3675.up.railway.app'

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
