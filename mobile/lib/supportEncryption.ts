import axios from 'axios'
import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { Platform } from 'react-native'
import nacl from 'tweetnacl'
import { supportChatApi } from './api'
import {
  createEncryptedEnvelope,
  createDeviceIdentity,
  decryptEnvelope,
  tryDecryptEnvelope,
  supportSafetyCode,
  type SupportCryptoProvider,
  type SupportDeviceIdentity,
  type SupportEncryptedEnvelope,
  type SupportPublicKey,
} from '../../shared/supportEncryption'
import {
  decryptSupportKeyBackup,
  encryptSupportKeyBackup,
  type SupportBackupCryptoProvider,
} from '../../shared/supportKeyBackup'

const provider: SupportCryptoProvider = {
  randomBytes: length => Platform.OS === 'web'
    ? crypto.getRandomValues(new Uint8Array(length))
    : Crypto.getRandomBytes(length),
  keyPairFromSecret: secretKey => nacl.box.keyPair.fromSecretKey(secretKey),
  encrypt: (message, nonce, recipientPublicKey, senderSecretKey) =>
    nacl.box(message, nonce, recipientPublicKey, senderSecretKey),
  decrypt: (ciphertext, nonce, senderPublicKey, recipientSecretKey) =>
    nacl.box.open(ciphertext, nonce, senderPublicKey, recipientSecretKey),
  hash: message => nacl.hash(message),
}

const identityStorageKey = (userId: number) => `majo-support-e2ee-key:${userId}`
const verificationStorageKey = (userId: number) => `majo-support-key-verified:${userId}`
const backupProvider: SupportBackupCryptoProvider = {
  randomBytes: length => Platform.OS === 'web'
    ? crypto.getRandomValues(new Uint8Array(length))
    : Crypto.getRandomBytes(length),
  deriveKey: (password, salt, iterations) =>
    pbkdf2Async(sha256, password, salt, { c: iterations, dkLen: 32 }),
  encrypt: async (plaintext, keyBytes, associatedData) => {
    const key = await Crypto.AESEncryptionKey.import(keyBytes)
    const sealed = await Crypto.aesEncryptAsync(plaintext, key, {
      nonce: { bytes: backupProvider.randomBytes(12) },
      additionalData: associatedData,
      tagLength: 16,
    })
    return new Uint8Array(await sealed.combined())
  },
  decrypt: async (combined, keyBytes, associatedData) => {
    if (combined.length < 28) throw new Error('Support key backup data is truncated.')
    const key = await Crypto.AESEncryptionKey.import(keyBytes)
    const sealed = Crypto.AESSealedData.fromCombined(combined)
    const plaintext = await Crypto.aesDecryptAsync(sealed, key, { additionalData: associatedData })
    if (typeof plaintext === 'string') throw new Error('Support key backup returned an invalid plaintext format.')
    return plaintext
  },
}

export async function getOrCreateSupportIdentity(userId: number): Promise<SupportDeviceIdentity> {
  const storageKey = identityStorageKey(userId)
  const stored = Platform.OS === 'web'
    ? localStorage.getItem(storageKey)
    : await SecureStore.getItemAsync(storageKey)
  if (stored) {
    const identity = JSON.parse(stored) as SupportDeviceIdentity
    if (!identity.deviceId || !identity.publicKey || !identity.secretKey) {
      throw new Error('Stored support encryption key is invalid. It cannot be recovered; contact support to continue.')
    }
    return identity
  }

  const { data } = await supportChatApi.getKeyBackup()
  if (data.backup) {
    throw new Error('This account has an encrypted chat-key backup. Sign in with your email and account password to restore it; password resets cannot unlock old keys.')
  }

  const identity = createDeviceIdentity(provider)
  if (Platform.OS === 'web') localStorage.setItem(storageKey, JSON.stringify(identity))
  else await SecureStore.setItemAsync(storageKey, JSON.stringify(identity))
  return identity
}

export async function initializeSupportEncryptionBackup(
  userId: number,
  password: string,
  restorePassword = password,
): Promise<void> {
  const { data } = await supportChatApi.getKeyBackup()
  const storageKey = identityStorageKey(userId)
  const stored = Platform.OS === 'web'
    ? localStorage.getItem(storageKey)
    : await SecureStore.getItemAsync(storageKey)
  let identity: SupportDeviceIdentity

  if (stored) {
    identity = JSON.parse(stored) as SupportDeviceIdentity
    if (!identity.deviceId || !identity.publicKey || !identity.secretKey) {
      throw new Error('The local support encryption key is invalid and cannot be backed up.')
    }
  } else if (data.backup) {
    try {
      identity = await decryptSupportKeyBackup(backupProvider, data.backup, restorePassword, userId)
    } catch {
      throw new Error('The encrypted support key backup could not be unlocked with this password. Password resets cannot recover old chat keys.')
    }
    if (Platform.OS === 'web') localStorage.setItem(storageKey, JSON.stringify(identity))
    else await SecureStore.setItemAsync(storageKey, JSON.stringify(identity))
  } else {
    identity = createDeviceIdentity(provider)
    if (Platform.OS === 'web') localStorage.setItem(storageKey, JSON.stringify(identity))
    else await SecureStore.setItemAsync(storageKey, JSON.stringify(identity))
  }

  if (stored || !data.backup || restorePassword !== password) {
    const backup = await encryptSupportKeyBackup(backupProvider, identity, password, userId)
    try {
      await supportChatApi.saveKeyBackup(backup)
    } catch (cause) {
      if (!axios.isAxiosError(cause) || cause.response?.status !== 409) throw cause
      const { data: latest } = await supportChatApi.getKeyBackup()
      if (!latest.backup) throw cause
      identity = await decryptSupportKeyBackup(backupProvider, latest.backup, restorePassword, userId)
      if (Platform.OS === 'web') localStorage.setItem(storageKey, JSON.stringify(identity))
      else await SecureStore.setItemAsync(storageKey, JSON.stringify(identity))
      if (restorePassword !== password) {
        await supportChatApi.saveKeyBackup(await encryptSupportKeyBackup(backupProvider, identity, password, userId))
      }
    }
  }
  await supportChatApi.registerEncryptionKey(identity.deviceId, identity.publicKey)
}

export async function getSupportVerification(userId: number): Promise<string | null> {
  return Platform.OS === 'web'
    ? localStorage.getItem(verificationStorageKey(userId))
    : AsyncStorage.getItem(verificationStorageKey(userId))
}

export async function setSupportVerification(userId: number, safetyCode: string): Promise<void> {
  if (Platform.OS === 'web') localStorage.setItem(verificationStorageKey(userId), safetyCode)
  else await AsyncStorage.setItem(verificationStorageKey(userId), safetyCode)
}

export const supportCrypto = provider

export const createSupportEnvelope = (
  body: string,
  senderKeyId: string,
  identity: SupportDeviceIdentity,
  keys: SupportPublicKey[],
): SupportEncryptedEnvelope =>
  createEncryptedEnvelope(provider, body, senderKeyId, identity.secretKey, keys)

export const decryptSupportEnvelope = (
  body: string,
  recipientKeyId: string,
  identity: SupportDeviceIdentity,
  keys: SupportPublicKey[],
) => decryptEnvelope(provider, body, recipientKeyId, identity.secretKey, keys)

export const tryDecryptSupportEnvelope = (
  body: string,
  recipientKeyId: string,
  identity: SupportDeviceIdentity,
  keys: SupportPublicKey[],
) => tryDecryptEnvelope(provider, body, recipientKeyId, identity.secretKey, keys)

export const getSupportSafetyCode = (keys: SupportPublicKey[]) => supportSafetyCode(provider, keys)
