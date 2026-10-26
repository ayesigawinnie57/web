import axios from 'axios'
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js'
import { sha256 } from '@noble/hashes/sha2.js'
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
} from '../../../shared/supportEncryption'
import {
  decryptSupportKeyBackup,
  encryptSupportKeyBackup,
  type SupportBackupCryptoProvider,
} from '../../../shared/supportKeyBackup'

const arrayBufferSource = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(bytes.length)
  copy.set(bytes)
  return copy.buffer
}

const provider: SupportCryptoProvider = {
  randomBytes: length => crypto.getRandomValues(new Uint8Array(length)),
  keyPairFromSecret: secretKey => nacl.box.keyPair.fromSecretKey(secretKey),
  encrypt: (message, nonce, recipientPublicKey, senderSecretKey) =>
    nacl.box(message, nonce, recipientPublicKey, senderSecretKey),
  decrypt: (ciphertext, nonce, senderPublicKey, recipientSecretKey) =>
    nacl.box.open(ciphertext, nonce, senderPublicKey, recipientSecretKey),
  hash: message => nacl.hash(message),
}

const identityStorageKey = (userId: number) => `majo-support-e2ee-key:${userId}`
const backupProvider: SupportBackupCryptoProvider = {
  randomBytes: length => crypto.getRandomValues(new Uint8Array(length)),
  deriveKey: (password, salt, iterations) =>
    pbkdf2Async(sha256, password, salt, { c: iterations, dkLen: 32 }),
  encrypt: async (plaintext, keyBytes, associatedData) => {
    const key = await crypto.subtle.importKey('raw', arrayBufferSource(keyBytes), 'AES-GCM', false, ['encrypt'])
    const nonce = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = new Uint8Array(await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: arrayBufferSource(nonce), additionalData: arrayBufferSource(associatedData), tagLength: 128 },
      key,
      arrayBufferSource(plaintext),
    ))
    const combined = new Uint8Array(nonce.length + encrypted.length)
    combined.set(nonce)
    combined.set(encrypted, nonce.length)
    return combined
  },
  decrypt: async (combined, keyBytes, associatedData) => {
    if (combined.length < 28) throw new Error('Support key backup data is truncated.')
    const key = await crypto.subtle.importKey('raw', arrayBufferSource(keyBytes), 'AES-GCM', false, ['decrypt'])
    return new Uint8Array(await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: arrayBufferSource(combined.subarray(0, 12)),
        additionalData: arrayBufferSource(associatedData),
        tagLength: 128,
      },
      key,
      arrayBufferSource(combined.subarray(12)),
    ))
  },
}

export async function getOrCreateSupportIdentity(userId: number): Promise<SupportDeviceIdentity> {
  const storageKey = identityStorageKey(userId)
  const stored = localStorage.getItem(storageKey)
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
  localStorage.setItem(storageKey, JSON.stringify(identity))
  return identity
}

export async function initializeSupportEncryptionBackup(
  userId: number,
  password: string,
  restorePassword = password,
): Promise<void> {
  const { data } = await supportChatApi.getKeyBackup()
  const stored = localStorage.getItem(identityStorageKey(userId))
  let identity: SupportDeviceIdentity

  if (stored) {
    identity = JSON.parse(stored) as SupportDeviceIdentity
    if (!identity.deviceId || !identity.publicKey || !identity.secretKey) {
      throw new Error('The local support encryption key is invalid and cannot be backed up.')
    }
    if (data.backup && restorePassword === password) {
      if (data.backup.device_id === identity.deviceId) {
        await supportChatApi.registerEncryptionKey(identity.deviceId, identity.publicKey)
        return
      }
      identity = await decryptSupportKeyBackup(backupProvider, data.backup, password, userId)
      localStorage.setItem(identityStorageKey(userId), JSON.stringify(identity))
      await supportChatApi.registerEncryptionKey(identity.deviceId, identity.publicKey)
      return
    }
  } else if (data.backup) {
    try {
      identity = await decryptSupportKeyBackup(backupProvider, data.backup, restorePassword, userId)
    } catch {
      throw new Error('The encrypted support key backup could not be unlocked with this password. Password resets cannot recover old chat keys.')
    }
    localStorage.setItem(identityStorageKey(userId), JSON.stringify(identity))
  } else {
    identity = createDeviceIdentity(provider)
    localStorage.setItem(identityStorageKey(userId), JSON.stringify(identity))
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
      localStorage.setItem(identityStorageKey(userId), JSON.stringify(identity))
      if (restorePassword !== password) {
        await supportChatApi.saveKeyBackup(await encryptSupportKeyBackup(backupProvider, identity, password, userId))
      }
    }
  }
  await supportChatApi.registerEncryptionKey(identity.deviceId, identity.publicKey)
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
