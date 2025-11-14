import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { InputSanitizerService } from '../utils/inputSanitizer';
import { UpdateUserDto } from './user.dto';

/**
 * 향상된 보안 기능을 갖춘 사용자 프로필 업데이트용 커스텀 검증 파이프
 */
@Injectable()
export class UserProfileValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(UserProfileValidationPipe.name);
  private readonly inputSanitizer = new InputSanitizerService();

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // 검증 전에 입력값 새니타이즈
    const sanitizedValue = this.sanitizeInput(value);

    // 클래스 인스턴스로 변환
    const object = plainToClass(metatype, sanitizedValue);

    // class-validator 데코레이터를 사용하여 검증
    const errors = await validate(object);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => {
          return Object.values(error.constraints || {}).join(', ');
        })
        .join('; ');

      this.logger.warn('Profile update validation failed', {
        errors: errorMessages,
        sanitizedValue: this.logSafeValue(sanitizedValue),
      });

      throw new BadRequestException({
        message: 'Validation failed',
        error: errorMessages,
        errorCode: 'VALIDATION_ERROR',
      });
    }

    // 추가 보안 검사
    this.performSecurityChecks(sanitizedValue);

    return object;
  }

  private toValidate(metatype: any): boolean {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private sanitizeInput(value: any): any {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const sanitized = { ...value };

    // 각 필드를 목적에 따라 새니타이즈
    if (sanitized.userName) {
      sanitized.userName = this.inputSanitizer.sanitizeName(sanitized.userName);
    }

    if (sanitized.userEmail) {
      sanitized.userEmail = this.inputSanitizer.sanitizeEmail(
        sanitized.userEmail,
      );
    }

    if (sanitized.userDescription) {
      sanitized.userDescription = this.inputSanitizer.sanitizeDescription(
        sanitized.userDescription,
      );
    }

    return sanitized;
  }

  private performSecurityChecks(value: UpdateUserDto): void {
    // 잠재적인 SQL 인젝션 패턴 검사
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(--|\/\*|\*\/)/,
      /(\bSCRIPT\b)/i,
    ];

    const checkValue = (fieldValue: string, fieldName: string) => {
      if (!fieldValue) return;

      for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(fieldValue)) {
          this.logger.error('Potential SQL injection attempt detected', {
            field: fieldName,
            pattern: pattern.toString(),
            value: fieldValue.substring(0, 50) + '...', // Log only first 50 chars
          });

          throw new BadRequestException({
            message: 'Invalid input detected',
            error: `${fieldName} contains invalid characters`,
            errorCode: 'SECURITY_VIOLATION',
          });
        }
      }
    };

    // 각 필드의 보안 위반 검사
    if (value.userName) {
      checkValue(value.userName, 'userName');
    }

    if (value.userEmail) {
      checkValue(value.userEmail, 'userEmail');
    }

    if (value.userDescription) {
      checkValue(value.userDescription, 'userDescription');
    }

    // 공격을 나타낼 수 있는 과도한 특수 문자 검사
    const specialCharPattern = /[<>{}[\]\\\/\$\^]/g;

    Object.entries(value).forEach(([key, val]) => {
      if (typeof val === 'string') {
        const specialCharCount = (val.match(specialCharPattern) || []).length;
        const totalLength = val.length;

        // 문자의 10% 이상이 특수 문자인 경우 의심스러운 것으로 표시
        if (totalLength > 0 && specialCharCount / totalLength > 0.1) {
          this.logger.warn(
            'Suspicious input with high special character ratio',
            {
              field: key,
              specialCharRatio: specialCharCount / totalLength,
              value: val.substring(0, 50) + '...',
            },
          );

          throw new BadRequestException({
            message: 'Invalid input format',
            error: `${key} contains too many special characters`,
            errorCode: 'INVALID_FORMAT',
          });
        }
      }
    });
  }

  private logSafeValue(value: any): any {
    // 로깅을 위한 안전한 버전 생성 (긴 문자열 잘라내기)
    if (!value || typeof value !== 'object') {
      return value;
    }

    const safe = { ...value };
    Object.keys(safe).forEach((key) => {
      if (typeof safe[key] === 'string' && safe[key].length > 100) {
        safe[key] = safe[key].substring(0, 100) + '...';
      }
    });

    return safe;
  }
}
