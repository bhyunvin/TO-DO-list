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
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};
