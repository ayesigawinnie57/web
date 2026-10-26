import axios from 'axios'
import * as Device from 'expo-device'
import * as SecureStore from 'expo-secure-store'
import * as Location from 'expo-location'
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

export type SigninLocation = { latitude: number; longitude: number }

export const getSigninLocation = async (): Promise<SigninLocation | null> => {
  try {
    if (Platform.OS === 'web') {
      return await new Promise(resolve => {
        if (!navigator.geolocation) {
          resolve(null)
          return
        }
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: false, maximumAge: 0, timeout: 10_000 },
        )
      })
    }

    const permission = await Location.requestForegroundPermissionsAsync()
    if (permission.status !== 'granted') return null
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    return { latitude: position.coords.latitude, longitude: position.coords.longitude }
  } catch {
    return null
  }
}

const signinDeviceName = Platform.OS === 'web'
  ? 'Mobile web browser'
  : `${Device.modelName ?? (Platform.OS === 'ios' ? 'iPhone' : 'Android device')} app`

export const authApi = {
  login: (email: string, password: string, trusted_device?: string | null, signin_location?: SigninLocation | null) =>
    axios.post<LoginResponse>(`${BASE_URL}/api/auth/login/`, { email, password, trusted_device, signin_location, device_name: signinDeviceName }, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
  verifyEmailMfa: (challenge_id: string, code: string, signin_location?: SigninLocation | null) =>
    axios.post<MfaLoginSuccess>(`${BASE_URL}/api/auth/login/email-code/verify/`, { challenge_id, code, remember_device: true, signin_location }, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
  resendEmailMfa: (challenge_id: string) =>
    axios.post<{ detail: string }>(`${BASE_URL}/api/auth/login/email-code/resend/`, { challenge_id }, { headers: { 'ngrok-skip-browser-warning': 'true' } }),

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

export type MfaChallenge = {
  mfa_required: true
  challenge_id: string
  email_hint: string
}

export type MfaLoginSuccess = {
  access: string
  refresh: string
  trusted_device?: string
}

export type LoginResponse = MfaLoginSuccess | MfaChallenge

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
  saveTrustedDevice: (token: string) => storage.set('mfa_trusted_device', token),
  getTrustedDevice: () => storage.get('mfa_trusted_device'),
}
