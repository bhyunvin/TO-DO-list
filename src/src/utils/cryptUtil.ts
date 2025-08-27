import bcrypt from 'bcrypt';
import crypto from 'crypto';

// 암호화
export async function encrypt(rawText: string): Promise<string> {
  const saltOrRounds = 10;
  return await bcrypt.hash(rawText, saltOrRounds);
}

// 암호문과 대조
export async function isHashValid(
  rawText: string,
  hashedText: string,
): Promise<boolean> {
  return await bcrypt.compare(rawText, hashedText);
}

// DB, API KEY 등 복호화 가능하게끔 암호화
export function encryptForDecrypt(text: string) {
  const algorithm = 'aes-256-cbc';
  const secretKey = process.env.SECRET_KEY;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// 암호화된 텍스트 복호화
export function decrypt(text: string): string {
  const secretKey = process.env.SECRET_KEY;
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}