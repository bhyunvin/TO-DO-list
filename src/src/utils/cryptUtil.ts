import bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || '01234567890123456789012345678901';
const IV_LENGTH = 16;

if (Buffer.from(ENCRYPTION_KEY).length !== 32) {
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
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
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
      Buffer.from(ENCRYPTION_KEY),
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
  if (envIv) {
    return Buffer.from(envIv, 'hex');
  }
  return Buffer.alloc(16, 'a1b2c3d4e5f6g7h8');
};

const FIXED_IV = getFixedIv();

export const encryptSymmetricDeterministic = (text: string): string => {
  if (!text) return text;

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
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
      Buffer.from(ENCRYPTION_KEY),
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
