import bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// 암호화 설정
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || '01234567890123456789012345678901'; // 32 chars for examples
const IV_LENGTH = 16;

if (Buffer.from(ENCRYPTION_KEY).length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes long for AES-256');
}

// 단방향 암호화 (비밀번호용)
export const encrypt = async (rawText: string): Promise<string> => {
  const saltOrRounds = 10;
  return await bcrypt.hash(rawText, saltOrRounds);
};

// 단방향 암호화 검증
export const isHashValid = async (
  rawText: string,
  hashedText: string,
): Promise<boolean> => {
  return await bcrypt.compare(rawText, hashedText);
};

// 양방향 암호화 (API Key용)
export const encryptSymmetric = (text: string): string => {
  if (!text) return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// 양방향 복호화
export const decryptSymmetric = (text: string): string => {
  if (!text) return text;

  try {
    const textParts = text.split(':');
    // IV가 없는 경우 (잘못된 형식이거나 평문일 가능성) 처리
    if (textParts.length < 2) return text;

    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch {
    // 복호화 실패 시 (기존 평문 데이터일 수 있음) 원본 반환
    // console.error('Decryption failed:', error);
    return text;
  }
};

// 고정 IV 조회 (결정적 암호화를 위함)
const getFixedIv = () => {
  const envIv = process.env.DETERMINISTIC_IV;
  if (envIv) {
    return Buffer.from(envIv, 'hex');
  }
  return Buffer.alloc(16, 'a1b2c3d4e5f6g7h8');
};

const FIXED_IV = getFixedIv();

// 결정적 양방향 암호화 (검색 가능해야 하는 데이터용 - 예: 이메일)
export const encryptSymmetricDeterministic = (text: string): string => {
  if (!text) return text;

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    FIXED_IV,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // 구분을 위해 prefix 추가하지 않음 (또는 다른 방식으로 구분 가능)
  // 여기서는 구조를 맞추기 위해 IV:Ciphertext 형식을 유지하되, IV는 고정값 사용
  return FIXED_IV.toString('hex') + ':' + encrypted.toString('hex');
};

// 결정적 양방향 복호화
export const decryptSymmetricDeterministic = (text: string): string => {
  if (!text) return text;

  try {
    const textParts = text.split(':');
    if (textParts.length < 2) return text;

    const ivMsg = textParts.shift();
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY),
      Buffer.from(ivMsg, 'hex'), // 저장된 IV 사용 (FIXED_IV와 같아야 함)
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch {
    return text;
  }
};
