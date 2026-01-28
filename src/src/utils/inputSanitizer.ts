/**
 * 보안 취약점을 방지하기 위해 사용자 입력을 정제하는 유틸리티 서비스
 */

export class InputSanitizerService {
  /**
   * 잠재적으로 위험한 문자를 제거하여 문자열 입력을 정제합니다
   * @param input - 정제할 입력 문자열
   * @param options - 정제 옵션
   * @returns 정제된 문자열
   */
  sanitizeString(
    input: string,
    options: {
      allowHtml?: boolean;
      maxLength?: number;
      trimWhitespace?: boolean;
    } = {},
  ): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // 요청된 경우 공백 제거 (기본값: true)
    if (options.trimWhitespace !== false) {
      sanitized = sanitized.trim();
    }

    // 허용되지 않은 경우 HTML 태그 제거 (기본값: 허용 안 함)
    if (!options.allowHtml) {
      sanitized = sanitized.replaceAll(/<[^>]*>/g, '');
    }

    // XSS 방지를 위해 스크립트 관련 콘텐츠 제거
    sanitized = sanitized.replaceAll(/javascript:/gi, '');
    sanitized = sanitized.replaceAll(/on\w+\s*=/gi, '');

    // 지정된 경우 길이 제한
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  /**
   * 특정 이메일 검증 규칙으로 이메일 입력을 정제합니다
   * @param email - 정제할 이메일
   * @returns 정제된 이메일 문자열
   */
  sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    // 기본 이메일 정제 - 위험한 문자를 제거하되 이메일 형식은 유지
    let sanitized = email.trim().toLowerCase();

    // 이메일에서 절대 유효하지 않고 위험할 수 있는 문자 제거
    sanitized = sanitized.replaceAll(/['"\\;()<>]/g, '');

    // 스크립트 관련 콘텐츠 제거
    sanitized = sanitized.replaceAll(/javascript:/gi, '');

    return sanitized;
  }

  /**
   * 사용자 이름 입력을 정제합니다
   * @param name - 정제할 이름
   * @returns 정제된 이름 문자열
   */
  sanitizeName(name: string): string {
    if (!name || typeof name !== 'string') {
      return '';
    }

    let sanitized = name.trim();

    // 이름에 문자(유니코드 포함), 숫자, 공백, 하이픈, 아포스트로피, 마침표 허용
    sanitized = sanitized.replaceAll(/[^\p{L}\p{N}\s\-'.]/gu, '');

    // 연속된 여러 공백 제거
    sanitized = sanitized.replaceAll(/\s+/g, ' ');

    // 이름 길이 제한
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200);
    }

    return sanitized;
  }

  /**
   * 설명/텍스트 콘텐츠를 정제합니다
   * @param description - 정제할 설명
   * @returns 정제된 설명 문자열
   */
  sanitizeDescription(description: string): string {
    if (!description || typeof description !== 'string') {
      return '';
    }

    let sanitized = description.trim();

    // 스크립트 태그와 위험한 HTML 제거
    sanitized = sanitized.replaceAll(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replaceAll(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    sanitized = sanitized.replaceAll(/javascript:/gi, '');
    sanitized = sanitized.replaceAll(/on\w+\s*=/gi, '');

    // 설명 길이 제한
    if (sanitized.length > 4000) {
      sanitized = sanitized.substring(0, 4000);
    }

    return sanitized;
  }

  /**
   * 문자열이 안전한 문자만 포함하는지 검증합니다
   * @param input - 검증할 입력
   * @param allowedPattern - 허용되는 문자에 대한 정규식 패턴
   * @returns 입력이 안전하면 true, 그렇지 않으면 false
   */
  isInputSafe(input: string, allowedPattern?: RegExp): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    // 기본 패턴은 문자, 숫자, 공백, 일반적인 구두점 허용
    // 유니코드 지원을 위해 u 플래그 사용
    const defaultPattern = /^[\p{L}\p{N}\s\-_.@]+$/u;
    const pattern = allowedPattern || defaultPattern;

    return pattern.test(input);
  }

  /**
   * 각 필드에 적절한 정제를 적용하여 객체를 정제합니다
   * @param obj - 정제할 객체
   * @param fieldRules - 특정 필드를 정제하기 위한 규칙
   * @returns 정제된 객체
   */
  sanitizeObject<T extends Record<string, any>>(
    obj: T,
    fieldRules: Partial<
      Record<keyof T, 'string' | 'email' | 'name' | 'description'>
    > = {},
  ): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = { ...obj };

    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        const rule = fieldRules[key as keyof T];

        switch (rule) {
          case 'email':
            (sanitized as Record<string, unknown>)[key] =
              this.sanitizeEmail(value);
            break;
          case 'name':
            (sanitized as Record<string, unknown>)[key] =
              this.sanitizeName(value);
            break;
          case 'description':
            (sanitized as Record<string, unknown>)[key] =
              this.sanitizeDescription(value);
            break;
          case 'string':
          default:
            (sanitized as Record<string, unknown>)[key] =
              this.sanitizeString(value);
            break;
        }
      }
    }

    return sanitized;
  }
}
