import { Logger } from '@nestjs/common';

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
  return await Bun.password.hash(rawText, {
    algorithm: 'bcrypt',
    cost: 10,
  });
};

/**
 * 해시된 비밀번호를 Bun.password로 검증
 */
export const isHashValid = async (
  rawText: string,
  hashedText: string,
): Promise<boolean> => {
  return await Bun.password.verify(rawText, hashedText, 'bcrypt');
};

/**
 * Web Crypto API를 사용한 대칭키 암호화 (랜덤 IV)
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

    // 암호화
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
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
    Logger.error(`Symmetric encryption failed: ${error.message}`, 'CryptUtil');
    return text;
  }
};

/**
 * Web Crypto API를 사용한 대칭키 복호화 (랜덤 IV)
 */
export const decryptSymmetric = async (text: string): Promise<string> => {
  if (!text) return text;

  try {
    const textParts = text.split(':');
    if (textParts.length < 3) return text;

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
    Logger.error(`Symmetric decryption failed: ${error.message}`, 'CryptUtil');
    // 복호화 실패 시 원본 반환
    return text;
  }
};

const getFixedIv = () => {
  const envIv = process.env.DETERMINISTIC_IV;
  // DETERMINISTIC_IV 처리 (16 bytes)
  // 환경변수가 없으면 기본값('a1b2c3d4e5f6g7h8') 사용
  const ivBuffer = getBufferFromEnv(
    envIv,
    16,
    'a1b2c3d4e5f6g7h8', // 16글자 fallback
  );

  // 길이가 안맞으면 fallback으로 강제 (안전장치)
  if (ivBuffer.length !== 16) {
    return new TextEncoder().encode('a1b2c3d4e5f6g7h8');
  }
  return ivBuffer;
};

const FIXED_IV = getFixedIv();

/**
 * Web Crypto API를 사용한 확정적 대칭키 암호화 (고정 IV)
 */
export const encryptSymmetricDeterministic = async (
  text: string,
): Promise<string> => {
  if (!text) return text;

  try {
    // CryptoKey 가져오기
    const key = await crypto.subtle.importKey(
      'raw',
      ENCRYPTION_KEY_BUF as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    );

    // 암호화
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: FIXED_IV as BufferSource,
      },
      key,
      new TextEncoder().encode(text),
    );

    // 결과는 [iv:authTag:encryptedData] 형태로 저장
    const encryptedArray = new Uint8Array(encrypted);
    const authTag = encryptedArray.slice(-16);
    const ciphertext = encryptedArray.slice(0, -16);

    return (
      bytesToHex(FIXED_IV) +
      ':' +
      bytesToHex(authTag) +
      ':' +
      bytesToHex(ciphertext)
    );
  } catch (error) {
    Logger.error(
      `Deterministic encryption failed: ${error.message}`,
      'CryptUtil',
    );
    return text;
  }
};

/**
 * Web Crypto API를 사용한 확정적 대칭키 복호화 (고정 IV)
 */
export const decryptSymmetricDeterministic = async (
  text: string,
): Promise<string> => {
  if (!text) return text;

  try {
    const textParts = text.split(':');
    if (textParts.length < 3) return text;

    const ivMsg = textParts[0];
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
        iv: hexToBytes(ivMsg) as BufferSource,
      },
      key,
      encryptedData as BufferSource,
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    Logger.error(
      `Deterministic decryption failed: ${error.message}`,
      'CryptUtil',
    );
    return text;
  }
};
