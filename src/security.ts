import { createHmac, webcrypto } from 'crypto';

const MAX_TIMESTAMP = 0x3fffffffffffn;
const MAX_SEQUENCE = 0x7ff;
const MAX_MACHINE = 0x3ff;
const SALT_LENGTH = 16;

/**
 * Generates a unique ID based on timestamp, machine ID, and sequence number.
 * @returns {BigInt} The generated unique ID.
 */
export function uniqid() {
  // get current timestamp
  let timestamp = BigInt(Date.now() - uniqid.epoch) & MAX_TIMESTAMP;

  // same timestamp
  if (timestamp === uniqid.lastTimestamp) {
    // increase sequence
    uniqid.sequence = (uniqid.sequence + 1) & MAX_SEQUENCE;

    // sequence back to 0 - wait for next ms
    if (uniqid.sequence === 0) {
      do {
        timestamp = BigInt(Date.now() - uniqid.epoch) & MAX_TIMESTAMP;
      } while (timestamp <= uniqid.lastTimestamp);
    }
  } else {
    uniqid.sequence = 0;
  }

  // save
  uniqid.lastTimestamp = timestamp;

  // return
  return (timestamp << 21n) | (BigInt(uniqid.machine & MAX_MACHINE) << 11n) | BigInt(uniqid.sequence);
}

uniqid.machine = 0;
uniqid.sequence = 0;
uniqid.lastTimestamp = 0n;
uniqid.epoch = +new Date('2025-01-01 00:00:00.000');

/**
 * Converts an ArrayBuffer to a hexadecimal string.
 * @param {ArrayBuffer} buffer The buffer to convert.
 * @returns {string} The hexadecimal string representation of the buffer.
 */
const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

/**
 * Hashes a given message using the SHA-256 algorithm.
 * @param {string} message The message to hash.
 * @returns {Promise<string>} A promise that resolves to the hashed message in hexadecimal form.
 */
export async function hash(message: string) {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', data);
  return toHex(hashBuffer);
}

/**
 * Creates a cryptographic key derived from a secret using PBKDF2 and AES-GCM.
 * @param {string} secret The secret key used to derive the cryptographic key.
 * @param {any} salt The salt used in the derivation process.
 * @returns {Promise<CryptoKey>} A promise that resolves to the derived cryptographic key.
 */
async function createKey(secret: string, salt: any) {
  const encoder = new TextEncoder();

  const keyMaterial = await webcrypto.subtle.importKey('raw', encoder.encode(secret), { name: 'PBKDF2' }, false, [
    'deriveKey',
  ]);

  return await webcrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: 1000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Converts an ArrayBuffer to a Base64 encoded string.
 * @param {ArrayBuffer} buffer The buffer to convert.
 * @returns {string} The Base64 encoded string representation of the buffer.
 */
const toBase64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));

/**
 * Converts a Base64 encoded string to a Uint8Array.
 * @param {string} buffer The Base64 encoded string to convert.
 * @returns {Uint8Array} The resulting Uint8Array.
 */
const fromBase64 = (buffer: string) => Uint8Array.from(atob(buffer), (c) => c.charCodeAt(0));

/**
 * Exports a cryptographic key in its raw form.
 * @param {webcrypto.CryptoKey} key The key to export.
 * @returns {Promise<ArrayBuffer>} A promise that resolves to the raw key.
 */
async function exportKey(key: webcrypto.CryptoKey) {
  return await webcrypto.subtle.exportKey('raw', key);
}

/**
 * Encrypts a message using AES-GCM with a secret key.
 * @param {string} message The message to encrypt.
 * @param {string} secretKey The secret key used for encryption.
 * @returns {Promise<string>} A promise that resolves to the Base64 encoded encrypted message.
 */
export async function encrypt(message: string, secretKey: string) {
  // Encode message and key
  const messageData = new TextEncoder().encode(message);

  // Derive a key from the secret
  const salt = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await createKey(secretKey, salt);

  // Encrypt the message
  const encrypted = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, messageData);

  // Convert encrypted data and IV to Base64
  const encryptedBase64 = toBase64(encrypted);
  const ivBase64 = toBase64(iv);
  const saltBase64 = toBase64(salt);

  return `${saltBase64}:${ivBase64}:${encryptedBase64}`; // return
}

/**
 * Decrypts an encrypted message using AES-GCM with a secret key.
 * @param {string} encryptedText The encrypted message in Base64 format.
 * @param {string} secret The secret key used for decryption.
 * @returns {Promise<string>} A promise that resolves to the decrypted message.
 */
export async function decrypt(encryptedText: string, secret: string) {
  // Extract IV and encrypted data from the input string
  const [saltBase64, ivBase64, encryptedBase64] = encryptedText.split(':');

  // Import the AES key
  const salt = fromBase64(saltBase64);
  const iv = fromBase64(ivBase64);
  const encrypted = fromBase64(encryptedBase64);

  // extract key
  const key = await createKey(secret, salt);

  // Decrypt the message
  const decrypted = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);

  // Convert decrypted bytes to string
  return new TextDecoder().decode(decrypted);
}

/**
 * Hashes a password using a salt and PBKDF2, returning the hashed password in Base64 format.
 * @param {string} password The password to hash.
 * @param {string} [algorithm='hashed'] The hashing algorithm. Defaults to 'hashed'.
 * @param {any} [salt] The salt used for hashing. If not provided, a random salt is generated.
 * @returns {Promise<string>} A promise that resolves to the hashed password.
 */
export async function hashPassword(password: string, algorithm = 'hashed', salt?: any) {
  if (algorithm === 'plain') return `plain:${password}`;

  if (!salt) salt = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await exportKey(await createKey(password, salt));

  return `hashed:${toBase64(salt)}:${toBase64(key)}`;
}

/**
 * Compares a plain or hashed password with a given hashed password.
 * @param {string} hashedPassword The stored hashed password.
 * @param {string} password The plain password to compare.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the passwords match, otherwise `false`.
 */
export async function comparePassword(hashedPassword: string, password: string) {
  // plain password
  const [htype, value, _] = hashedPassword.split(':');
  if (htype === 'plain') return password === value;

  // text password
  return (await hashPassword(password, 'hashed', fromBase64(value))) === hashedPassword;
}

/**
 * Signs a JWT (JSON Web Token) with a given payload and secret key.
 * @param {Record<string, any>} payload The payload to include in the JWT.
 * @param {string} secret The secret key used to sign the JWT.
 * @returns {string} The signed JWT.
 */
export function jwtSign(payload: Record<string, any>, secret: string) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const hmac = createHmac('sha256', secret);
  const content =
    Buffer.from(JSON.stringify(header)).toString('base64url') +
    '.' +
    Buffer.from(
      JSON.stringify({
        iat: Math.floor(+new Date() / 1000),
        ...payload,
      }),
    ).toString('base64url');
  hmac.update(content);
  const signature = hmac.digest('base64url');

  return content + '.' + signature;
}

/**
 * Verifies a JWT (JSON Web Token) using a given secret key.
 * @param {string} token The JWT to verify.
 * @param {string} secret The secret key used to verify the JWT.
 * @returns {Record<string, any> | false} The decoded payload if the JWT is valid, otherwise `false`.
 */
export function jwtVerify(token: string, secret: string) {
  if (!token) return false;

  const ps = token.split('.');

  if (ps.length !== 3) return false;

  // verify signature
  const hmac = createHmac('sha256', secret);
  if (hmac.update(ps.slice(0, 2).join('.')).digest('base64url') !== ps[2]) return false;

  // decode
  const payload = JSON.parse(Buffer.from(ps[1], 'base64url').toString());

  // verify exp
  if (payload.exp && +new Date() / 1000 >= payload.exp) return false;

  return payload;
}
