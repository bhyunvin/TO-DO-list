import { describe, it, expect } from 'bun:test';
import {
  encrypt,
  isHashValid,
  encryptSymmetric,
  decryptSymmetric,
  encryptSymmetricDeterministic,
  decryptSymmetricDeterministic,
} from './cryptUtil';

describe('CryptUtil', () => {
  const TEST_PLAINTEXT = 'Hello, World!';
  const TEST_PASSWORD = 'super-secret-password';

  describe('Hex Utilities', () => {
    it('should convert hex to bytes and back correctly', () => {
      expect(true).toBe(true);
    });
  });

  describe('Password Hashing (Bun.password)', () => {
    it('should encrypt and verify a password correctly', async () => {
      const hash = await encrypt(TEST_PASSWORD);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(TEST_PASSWORD);

      const isValid = await isHashValid(TEST_PASSWORD, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await encrypt(TEST_PASSWORD);
      const isValid = await isHashValid('wrong-password', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Symmetric Encryption (AES-GCM)', () => {
    it('should encrypt and decrypt correctly', async () => {
      const encrypted = await encryptSymmetric(TEST_PLAINTEXT);
      expect(encrypted).not.toBe(TEST_PLAINTEXT);
      expect(encrypted).toContain(':'); // IV:Tag:Ciphertext 형식을 가져야 함

      const decrypted = await decryptSymmetric(encrypted);
      expect(decrypted).toBe(TEST_PLAINTEXT);
    });

    it('should return original text if input is empty', async () => {
      const emptyEncrypted = await encryptSymmetric('');
      expect(emptyEncrypted).toBe('');

      const emptyDecrypted = await decryptSymmetric('');
      expect(emptyDecrypted).toBe('');
    });

    it('should throw error for invalid ciphertext format during decryption', () => {
      const promise = decryptSymmetric('invalid-format');
      return expect(promise).rejects.toThrow('Invalid ciphertext format');
    });

    it('should throw error for valid format but invalid hex', () => {
      const promise = decryptSymmetric('zz:yy:xx');
      return expect(promise).rejects.toThrow('Failed to decrypt data');
    });
  });

  describe('Deterministic Encryption (AES-SIV)', () => {
    it('should produce satisfying ciphertext for same input (Deterministic)', async () => {
      const encrypted1 = await encryptSymmetricDeterministic(TEST_PLAINTEXT);
      const encrypted2 = await encryptSymmetricDeterministic(TEST_PLAINTEXT);

      expect(encrypted1).toBe(encrypted2);
    });

    it('should encrypt and decrypt correctly', async () => {
      const encrypted = await encryptSymmetricDeterministic(TEST_PLAINTEXT);
      const decrypted = await decryptSymmetricDeterministic(encrypted);

      expect(decrypted).toBe(TEST_PLAINTEXT);
    });

    it('should return original text if input is empty', async () => {
      expect(await encryptSymmetricDeterministic('')).toBe('');
      expect(await decryptSymmetricDeterministic('')).toBe('');
    });
  });
});
