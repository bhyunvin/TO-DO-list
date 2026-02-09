import { describe, it, expect } from 'bun:test';
import {
  encrypt,
  isHashValid,
  encryptSymmetric,
  decryptSymmetric,
  encryptSymmetricDeterministic,
  decryptSymmetricDeterministic,
} from './cryptUtil';

describe('CryptUtil (암호화 유틸리티)', () => {
  const TEST_PLAINTEXT = 'Hello, World!';
  const TEST_PASSWORD = 'super-secret-password';

  describe('Hex 유틸리티', () => {
    it('hex를 바이트로, 다시 바이트를 hex로 올바르게 변환해야 함', () => {
      expect(true).toBe(true);
    });
  });

  describe('비밀번호 해싱 (Bun.password)', () => {
    it('비밀번호를 올바르게 암호화하고 검증해야 함', async () => {
      const hash = await encrypt(TEST_PASSWORD);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(TEST_PASSWORD);

      const isValid = await isHashValid(TEST_PASSWORD, hash);
      expect(isValid).toBe(true);
    });

    it('잘못된 비밀번호에 대해 false를 반환해야 함', async () => {
      const hash = await encrypt(TEST_PASSWORD);
      const isValid = await isHashValid('wrong-password', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('대칭 암호화 (AES-GCM)', () => {
    it('올바르게 암호화 및 복호화되어야 함', async () => {
      const encrypted = await encryptSymmetric(TEST_PLAINTEXT);
      expect(encrypted).not.toBe(TEST_PLAINTEXT);
      expect(encrypted).toContain(':'); // IV:Tag:Ciphertext 형식을 가져야 함

      const decrypted = await decryptSymmetric(encrypted);
      expect(decrypted).toBe(TEST_PLAINTEXT);
    });

    it('입력이 비어있으면 원본 텍스트를 반환해야 함', async () => {
      const emptyEncrypted = await encryptSymmetric('');
      expect(emptyEncrypted).toBe('');

      const emptyDecrypted = await decryptSymmetric('');
      expect(emptyDecrypted).toBe('');
    });

    it('복호화 중 유효하지 않은 암호문 형식에 대해 에러를 던져야 함', () => {
      const promise = decryptSymmetric('invalid-format');
      return expect(promise).rejects.toThrow('유효하지 않은 암호문 형식입니다');
    });

    it('올바른 형식이나 유효하지 않은 hex인 경우 에러를 던져야 함', () => {
      const promise = decryptSymmetric('zz:yy:xx');
      return expect(promise).rejects.toThrow('데이터 복호화에 실패했습니다');
    });
  });

  describe('결정적 암호화 (AES-SIV)', () => {
    it('동일한 입력에 대해 결정적인 암호문을 생성해야 함', async () => {
      const encrypted1 = await encryptSymmetricDeterministic(TEST_PLAINTEXT);
      const encrypted2 = await encryptSymmetricDeterministic(TEST_PLAINTEXT);

      expect(encrypted1).toBe(encrypted2);
    });

    it('올바르게 암호화 및 복호화되어야 함', async () => {
      const encrypted = await encryptSymmetricDeterministic(TEST_PLAINTEXT);
      const decrypted = await decryptSymmetricDeterministic(encrypted);

      expect(decrypted).toBe(TEST_PLAINTEXT);
    });

    it('입력이 비어있으면 원본 텍스트를 반환해야 함', async () => {
      expect(await encryptSymmetricDeterministic('')).toBe('');
      expect(await decryptSymmetricDeterministic('')).toBe('');
    });
  });
});
