import { decodeUtf8, encodeUtf8, type SupportDeviceIdentity } from './supportEncryption'

export const SUPPORT_BACKUP_VERSION = 1 as const
export const SUPPORT_BACKUP_KDF = 'PBKDF2-SHA256' as const
export const SUPPORT_BACKUP_ITERATIONS = 600_000

export type SupportKeyBackup = {
  version: typeof SUPPORT_BACKUP_VERSION
  kdf: typeof SUPPORT_BACKUP_KDF
  iterations: typeof SUPPORT_BACKUP_ITERATIONS
  device_id: string
  salt: string
  ciphertext: string
}

export type SupportBackupCryptoProvider = {
  randomBytes: (length: number) => Uint8Array
  deriveKey: (password: string, salt: Uint8Array, iterations: number) => Promise<Uint8Array>
  encrypt: (plaintext: Uint8Array, key: Uint8Array, associatedData: Uint8Array) => Promise<Uint8Array>
  decrypt: (ciphertext: Uint8Array, key: Uint8Array, associatedData: Uint8Array) => Promise<Uint8Array>
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function encodeBase64(bytes: Uint8Array): string {
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]
    const second = bytes[index + 1]
    const third = bytes[index + 2]
    output += BASE64[first >> 2]
    output += BASE64[((first & 3) << 4) | ((second ?? 0) >> 4)]
    output += second === undefined ? '=' : BASE64[((second & 15) << 2) | ((third ?? 0) >> 6)]
    output += third === undefined ? '=' : BASE64[third & 63]
  }
  return output
}

function decodeBase64(value: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('Support key backup data is malformed.')
  }
  const output = new Uint8Array((value.length * 3) / 4 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0))
  let offset = 0
  for (let index = 0; index < value.length; index += 4) {
    const a = BASE64.indexOf(value[index])
    const b = BASE64.indexOf(value[index + 1])
    const c = value[index + 2] === '=' ? 0 : BASE64.indexOf(value[index + 2])
    const d = value[index + 3] === '=' ? 0 : BASE64.indexOf(value[index + 3])
    output[offset++] = (a << 2) | (b >> 4)
    if (value[index + 2] !== '=') output[offset++] = ((b & 15) << 4) | (c >> 2)
    if (value[index + 3] !== '=') output[offset++] = ((c & 3) << 6) | d
  }
  return output
}

function associatedData(userId: number): Uint8Array {
  return encodeUtf8(`majo-support-key-backup:${SUPPORT_BACKUP_VERSION}:${userId}`)
}

export async function encryptSupportKeyBackup(
  provider: SupportBackupCryptoProvider,
  identity: SupportDeviceIdentity,
  password: string,
  userId: number,
): Promise<SupportKeyBackup> {
  if (!password) throw new Error('Account password is required to protect the support key backup.')
  const salt = provider.randomBytes(16)
  const key = await provider.deriveKey(password, salt, SUPPORT_BACKUP_ITERATIONS)
  const ciphertext = await provider.encrypt(
    encodeUtf8(JSON.stringify(identity)),
    key,
    associatedData(userId),
  )
  return {
    version: SUPPORT_BACKUP_VERSION,
    kdf: SUPPORT_BACKUP_KDF,
    iterations: SUPPORT_BACKUP_ITERATIONS,
    device_id: identity.deviceId,
    salt: encodeBase64(salt),
    ciphertext: encodeBase64(ciphertext),
  }
}

export async function decryptSupportKeyBackup(
  provider: SupportBackupCryptoProvider,
  backup: SupportKeyBackup,
  password: string,
  userId: number,
): Promise<SupportDeviceIdentity> {
  if (
    backup.version !== SUPPORT_BACKUP_VERSION
    || backup.kdf !== SUPPORT_BACKUP_KDF
    || backup.iterations !== SUPPORT_BACKUP_ITERATIONS
    || typeof backup.device_id !== 'string'
  ) {
    throw new Error('This support key backup uses an unsupported format.')
  }
  const salt = decodeBase64(backup.salt)
  if (salt.length !== 16) throw new Error('Support key backup salt is invalid.')
  const key = await provider.deriveKey(password, salt, SUPPORT_BACKUP_ITERATIONS)
  const plaintext = await provider.decrypt(decodeBase64(backup.ciphertext), key, associatedData(userId))
  const parsed: unknown = JSON.parse(decodeUtf8(plaintext))
  if (
    typeof parsed !== 'object' || parsed === null
    || !('deviceId' in parsed) || typeof parsed.deviceId !== 'string'
    || !('publicKey' in parsed) || typeof parsed.publicKey !== 'string'
    || !('secretKey' in parsed) || typeof parsed.secretKey !== 'string'
  ) {
    throw new Error('Decrypted support key backup is invalid.')
  }
  if (
    typeof parsed !== 'object' || parsed === null
    || !('deviceId' in parsed) || parsed.deviceId !== backup.device_id
  ) {
    throw new Error('Support key backup identity does not match its metadata.')
  }
  return parsed as SupportDeviceIdentity
}
