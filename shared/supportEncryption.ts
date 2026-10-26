export type SupportPublicKey = {
  key_id: string
  device_id: string
  user_id: number
  is_staff: boolean
  public_key: string
}

export type SupportRecipientCiphertext = {
  key_id: string
  nonce: string
  ciphertext: string
}

export type SupportEncryptedEnvelope = {
  version: 1
  sender_key_id: string
  recipients: SupportRecipientCiphertext[]
}

export type SupportDeviceIdentity = {
  deviceId: string
  publicKey: string
  secretKey: string
}

export type SupportCryptoProvider = {
  randomBytes: (length: number) => Uint8Array
  keyPairFromSecret: (secretKey: Uint8Array) => { publicKey: Uint8Array; secretKey: Uint8Array }
  encrypt: (message: Uint8Array, nonce: Uint8Array, recipientPublicKey: Uint8Array, senderSecretKey: Uint8Array) => Uint8Array
  decrypt: (ciphertext: Uint8Array, nonce: Uint8Array, senderPublicKey: Uint8Array, recipientSecretKey: Uint8Array) => Uint8Array | null
  hash: (message: Uint8Array) => Uint8Array
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function encodeBase64(bytes: Uint8Array): string {
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

export function decodeBase64(value: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('Invalid base64 encryption data.')
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

export function encodeUtf8(value: string): Uint8Array {
  const encoded = unescape(encodeURIComponent(value))
  return Uint8Array.from(encoded, character => character.charCodeAt(0))
}

export function decodeUtf8(value: Uint8Array): string {
  let binary = ''
  for (let index = 0; index < value.length; index += 0x8000) {
    binary += String.fromCharCode(...value.subarray(index, index + 0x8000))
  }
  return decodeURIComponent(escape(binary))
}

function createUuid(randomBytes: (length: number) => Uint8Array): string {
  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function createDeviceIdentity(provider: SupportCryptoProvider): SupportDeviceIdentity {
  const secretKey = provider.randomBytes(32)
  const pair = provider.keyPairFromSecret(secretKey)
  return {
    deviceId: createUuid(provider.randomBytes),
    publicKey: encodeBase64(pair.publicKey),
    secretKey: encodeBase64(pair.secretKey),
  }
}

export function createEncryptedEnvelope(
  provider: SupportCryptoProvider,
  body: string,
  senderKeyId: string,
  senderSecretKey: string,
  recipientKeys: SupportPublicKey[],
): SupportEncryptedEnvelope {
  const message = body.trim()
  if (!message || message.length > 2000) throw new Error('Messages must contain 1–2000 characters.')

  const uniqueRecipients = new Map(recipientKeys.map(key => [key.key_id, key]))
  if (!uniqueRecipients.has(senderKeyId)) throw new Error('The sender device must be included as a recipient.')
  if (uniqueRecipients.size > 100) throw new Error('Too many support encryption devices are registered.')

  const secret = decodeBase64(senderSecretKey)
  const bytes = encodeUtf8(message)
  return {
    version: 1,
    sender_key_id: senderKeyId,
    recipients: Array.from(uniqueRecipients.values()).map(key => {
      const nonce = provider.randomBytes(24)
      return {
        key_id: key.key_id,
        nonce: encodeBase64(nonce),
        ciphertext: encodeBase64(provider.encrypt(bytes, nonce, decodeBase64(key.public_key), secret)),
      }
    }),
  }
}

export function decryptEnvelope(
  provider: SupportCryptoProvider,
  envelopeInput: string | SupportEncryptedEnvelope,
  recipientKeyId: string,
  recipientSecretKey: string,
  keys: SupportPublicKey[],
): string {
  const envelope = typeof envelopeInput === 'string' ? JSON.parse(envelopeInput) as SupportEncryptedEnvelope : envelopeInput
  if (envelope.version !== 1 || !Array.isArray(envelope.recipients)) {
    throw new Error('Unsupported encrypted message format.')
  }
  const recipient = envelope.recipients.find(entry => entry.key_id === recipientKeyId)
  const sender = keys.find(key => key.key_id === envelope.sender_key_id)
  if (!recipient || !sender) throw new Error('This device cannot decrypt this message.')

  const plaintext = provider.decrypt(
    decodeBase64(recipient.ciphertext),
    decodeBase64(recipient.nonce),
    decodeBase64(sender.public_key),
    decodeBase64(recipientSecretKey),
  )
  if (!plaintext) throw new Error('Message decryption failed.')
  return decodeUtf8(plaintext)
}

export type SupportDecryptionResult =
  | { ok: true; plaintext: string }
  | { ok: false; reason: string }

export function tryDecryptEnvelope(
  provider: SupportCryptoProvider,
  envelope: string | SupportEncryptedEnvelope,
  recipientKeyId: string,
  recipientSecretKey: string,
  keys: SupportPublicKey[],
): SupportDecryptionResult {
  try {
    return {
      ok: true,
      plaintext: decryptEnvelope(provider, envelope, recipientKeyId, recipientSecretKey, keys),
    }
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Unknown decryption error.',
    }
  }
}

export function supportSafetyCode(provider: SupportCryptoProvider, keys: SupportPublicKey[]): string {
  if (!keys.length) throw new Error('No encryption keys are available to verify.')
  const roster = [...keys]
    .sort((left, right) => left.key_id.localeCompare(right.key_id))
    .map(key => `${key.key_id}:${key.user_id}:${key.is_staff ? 1 : 0}:${key.device_id}:${key.public_key}`)
    .join('\n')
  const fingerprint = Array.from(provider.hash(encodeUtf8(roster)).slice(0, 10), byte =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return fingerprint.match(/.{1,4}/g)?.join(' ') ?? fingerprint
}
