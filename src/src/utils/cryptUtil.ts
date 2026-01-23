import { aessiv } from '@noble/ciphers/aes.js';

// Web Crypto API 전역 객체 타입 선언 (Bun/Node 19+)
declare const crypto: Crypto;

/**
 * 환경 변수 값을 버퍼로 변환하는 헬퍼 함수
 * 1. Hex String 감지: 길이가 expectedByteLength * 2라면 Hex로 디코딩
 * 2. 일반 문자열: UTF-8 버퍼로 변환
 * 3. 길이 검증: 변환된 버퍼가 expectedByteLength와 다르면 Fallback 혹은 Error
 */
const getBufferFromEnv = (
  val: string | undefined,
  expectedByteLength: number,
  fallbackVal?: string,
): Uint8Array => {
  // 값이 없으면 fallback 사용
  if (!val && fallbackVal) {
    val = fallbackVal;
  }

  if (!val) {
    // 값도 없고 fallback도 없으면 빈 버퍼 반환 (호출처에서 에러 처리 유도 가능)
    return new Uint8Array(0);
  }

  // Hex String 감지 (길이가 2배이면 Hex일 확률이 높음)
  if (val.length === expectedByteLength * 2) {
    // Hex 디코딩 시도
    const hexBuffer = hexToBytes(val);
    // Hex 디코딩 결과 길이가 맞으면 성공으로 간주
    if (hexBuffer.length === expectedByteLength) {
      return hexBuffer;
    }
  }

  // 일반 문자열로 간주
  return new TextEncoder().encode(val);
};

/**
 * Hex 문자열을 Uint8Array로 변환
 */
const hexToBytes = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string: length must be even');
  }
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error('Invalid hex string: contains non-hex characters');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

/**
 * Uint8Array를 Hex 문자열로 변환
 */
const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// ENCRYPTION_KEY 로딩
const ENCRYPTION_KEY_BUF = getBufferFromEnv(
  process.env.ENCRYPTION_KEY,
  32,
  '01234567890123456789012345678901',
);

const IV_LENGTH = 16;

if (ENCRYPTION_KEY_BUF.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes long for AES-256');
}

/**
 * 비밀번호를 Bun.password로 해싱
 */
export const encrypt = async (rawText: string): Promise<string> => {
  try {
    return await Bun.password.hash(rawText, {
      algorithm: 'bcrypt',
      cost: 10,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Password hashing failed: ${errorMsg}`);
    throw new Error('Failed to hash password');
  }
};

/**
 * 해시된 비밀번호를 Bun.password로 검증
 */
export const isHashValid = async (
  rawText: string,
  hashedText: string,
): Promise<boolean> => {
  try {
    return await Bun.password.verify(rawText, hashedText, 'bcrypt');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Password verification failed: ${errorMsg}`);
    throw new Error('Failed to verify password');
  }
};

/**
 * Web Crypto API를 사용한 대칭키 암호화 (랜덤 IV)
 * @throws {Error} 암호화 실패 시 에러를 발생시킵니다.
 */
export const encryptSymmetric = async (text: string): Promise<string> => {
  if (!text) return text;

  try {
    // 랜덤 IV 생성
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // CryptoKey 가져오기
    const key = await crypto.subtle.importKey(
      'raw',
      ENCRYPTION_KEY_BUF as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    );

    // 암호화 (tagLength 명시적 지정)
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
        tagLength: 128, // 128비트 (16바이트) authTag 명시적 설정
      },
      key,
      new TextEncoder().encode(text),
    );

    // 결과는 [iv:authTag:encryptedData] 형태로 저장
    // AES-GCM에서 authTag는 암호화 결과의 마지막 16바이트
    const encryptedArray = new Uint8Array(encrypted);
    const authTag = encryptedArray.slice(-16);
    const ciphertext = encryptedArray.slice(0, -16);

    return (
      bytesToHex(iv) + ':' + bytesToHex(authTag) + ':' + bytesToHex(ciphertext)
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Symmetric encryption failed: ${errorMsg}`);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Web Crypto API를 사용한 대칭키 복호화 (랜덤 IV)
 * @throws {Error} 복호화 실패 시 에러를 발생시킵니다.
 */
export const decryptSymmetric = async (text: string): Promise<string> => {
  if (!text) return text;

  try {
    const textParts = text.split(':');
    if (textParts.length < 3) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = hexToBytes(textParts[0]);
    const authTag = hexToBytes(textParts[1]);
    const ciphertext = hexToBytes(textParts.slice(2).join(':'));

    // GCM 모드에서는 authTag를 암호문 뒤에 붙여야 함
    const encryptedData = new Uint8Array(ciphertext.length + authTag.length);
    encryptedData.set(ciphertext);
    encryptedData.set(authTag, ciphertext.length);

    // CryptoKey 가져오기
    const key = await crypto.subtle.importKey(
      'raw',
      ENCRYPTION_KEY_BUF as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );

    // 복호화
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      encryptedData as BufferSource,
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Symmetric decryption failed: ${errorMsg}`);
    throw new Error('Failed to decrypt data');
  }
};

// AES-SIV 키 캐싱
let _sivKeyPromise: Promise<Uint8Array> | null = null;

/**
 * HKDF를 사용하여 32바이트 마스터 키에서 64바이트 SIV 키 파생
 * (AES-256-SIV는 64바이트 키 필요: 32B enc + 32B mac)
 */
const getSivKey = (): Promise<Uint8Array> => {
  if (_sivKeyPromise !== null) return _sivKeyPromise;

  _sivKeyPromise = (async () => {
    try {
      const masterKey = await crypto.subtle.importKey(
        'raw',
        ENCRYPTION_KEY_BUF as BufferSource,
        { name: 'HKDF' },
        false,
        ['deriveBits'],
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: new TextEncoder().encode('TODO-APP-SIV-SALT-V1'),
          info: new TextEncoder().encode('AES-SIV-DERIVED-KEY'),
        },
        masterKey,
        512, // 64 bytes * 8 bits
      );

      return new Uint8Array(derivedBits);
    } catch (error) {
      _sivKeyPromise = null; // Reset promise on failure to allow retry
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`SIV key derivation failed: ${errorMsg}`);
      throw new Error('Failed to derive SIV key');
    }
  })();

  return _sivKeyPromise;
};

/**
 * AES-SIV (RFC 5297)를 사용한 강력한 결정적 암호화
 *
 * [보안 특징]
 * - 동일한 평문에 대해 항상 동일한 암호문을 생성합니다. (Deterministic)
 * - Synthetic IV(SIV) 모드를 사용하여 Nonce 재사용 문제에 내성이 있습니다.
 * - AES-GCM 방식과 달리 Semantic Security를 최대한 보장하면서 결정적 암호화를 제공합니다.
 *
 * @throws {Error} 암호화 실패 시 에러를 발생시킵니다.
 */
export const encryptSymmetricDeterministic = async (
  text: string,
): Promise<string> => {
  if (!text) return text;

  try {
    const key = await getSivKey();
    const siv = aessiv(key);
    const encrypted = siv.encrypt(new TextEncoder().encode(text));
    return bytesToHex(encrypted);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Deterministic encryption failed: ${errorMsg}`);
    throw new Error('Failed to encrypt data deterministically');
  }
};

/**
 * AES-SIV를 사용한 결정적 복호화
 * @throws {Error} 복호화 실패 시 에러를 발생시킵니다.
 */
export const decryptSymmetricDeterministic = async (
  text: string,
): Promise<string> => {
  if (!text) return text;

  try {
    const key = await getSivKey();
    const siv = aessiv(key);
    const decrypted = siv.decrypt(hexToBytes(text));
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Deterministic decryption failed: ${errorMsg}`);
    throw new Error('Failed to decrypt data deterministically');
  }
};
