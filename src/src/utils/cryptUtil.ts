import bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';


const ALGORITHM = 'aes-256-gcm';

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
): Buffer => {
  let buffer: Buffer;

  // 값이 없으면 fallback 사용
  if (!val && fallbackVal) {
    val = fallbackVal;
  }

  if (!val) {
    // 값도 없고 fallback도 없으면 빈 버퍼 반환 (호출처에서 에러 처리 유도 가능)
    return Buffer.alloc(0);
  }

  // Hex String 감지 (길이가 2배이면 Hex일 확률이 높음)
  if (val.length === expectedByteLength * 2) {
    // Hex 디코딩 시도
    const hexBuffer = Buffer.from(val, 'hex');
    // Hex 디코딩 결과 길이가 맞으면 성공으로 간주
    if (hexBuffer.length === expectedByteLength) {
      return hexBuffer;
    }
  }

  // 일반 문자열로 간주
  buffer = Buffer.from(val);
  return buffer;
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

export const encrypt = async (rawText: string): Promise<string> => {
  const saltOrRounds = 10;
  return await bcrypt.hash(rawText, saltOrRounds);
};

export const isHashValid = async (
  rawText: string,
  hashedText: string,
): Promise<boolean> => {
  return await bcrypt.compare(rawText, hashedText);
};

export const encryptSymmetric = (text: string): string => {
  if (!text) return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY_BUF, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  return (
    iv.toString('hex') +
    ':' +
    authTag.toString('hex') +
    ':' +
    encrypted.toString('hex')
  );
};

export const decryptSymmetric = (text: string): string => {
  if (!text) return text;

  try {
    const textParts = text.split(':');
    if (textParts.length < 3) return text;

    const iv = Buffer.from(textParts.shift(), 'hex');
    const authTag = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY_BUF,
      iv,
    );
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch {
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
      return Buffer.from('a1b2c3d4e5f6g7h8');
  }
  return ivBuffer;
};

const FIXED_IV = getFixedIv();

export const encryptSymmetricDeterministic = (text: string): string => {
  if (!text) return text;

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    ENCRYPTION_KEY_BUF,
    FIXED_IV,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  return (
    FIXED_IV.toString('hex') +
    ':' +
    authTag.toString('hex') +
    ':' +
    encrypted.toString('hex')
  );
};

export const decryptSymmetricDeterministic = (text: string): string => {
  if (!text) return text;

  try {
    const textParts = text.split(':');
    if (textParts.length < 3) return text;

    const ivMsg = textParts.shift();
    const authTag = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY_BUF,
      Buffer.from(ivMsg, 'hex'),
    );
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch {
    return text;
  }
};
