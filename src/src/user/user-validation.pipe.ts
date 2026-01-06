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
 * 사용자 프로필 업데이트용 커스텀 검증 파이프
 */
@Injectable()
export class UserProfileValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(UserProfileValidationPipe.name);
  private readonly inputSanitizer = new InputSanitizerService();

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const sanitizedValue = this.sanitizeInput(value);

    const object = plainToClass(metatype, sanitizedValue);

    const errors = await validate(object);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => {
          return Object.values(error.constraints || {}).join(', ');
        })
        .join('; ');

      this.logger.warn('프로필 업데이트 검증 실패', {
        errors: errorMessages,
        sanitizedValue: this.logSafeValue(sanitizedValue),
      });

      throw new BadRequestException({
        message: '검증 실패',
        error: errorMessages,
        errorCode: 'VALIDATION_ERROR',
      });
    }

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
    const { userName, userEmail, userDescription } = sanitized;

    if (userName) {
      sanitized.userName = this.inputSanitizer.sanitizeName(userName);
    }

    if (userEmail) {
      sanitized.userEmail = this.inputSanitizer.sanitizeEmail(userEmail);
    }

    if (userDescription) {
      sanitized.userDescription =
        this.inputSanitizer.sanitizeDescription(userDescription);
    }

    return sanitized;
  }

  private performSecurityChecks(value: UpdateUserDto): void {
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
          this.logger.error('잠재적인 SQL Injection 시도 감지됨', {
            field: fieldName,
            pattern: pattern.toString(),
            value: `${fieldValue.substring(0, 50)}...`,
          });

          throw new BadRequestException({
            message: '부적절한 입력 감지됨',
            error: `${fieldName}에 부적절한 문자가 포함되어 있습니다`,
            errorCode: 'SECURITY_VIOLATION',
          });
        }
      }
    };

    const { userName, userEmail, userDescription } = value;

    if (userName) {
      checkValue(userName, 'userName');
    }

    if (userEmail) {
      checkValue(userEmail, 'userEmail');
    }

    if (userDescription) {
      checkValue(userDescription, 'userDescription');
    }

    const specialCharPattern = /[<>{}[\\]\\\\\/$^]/g;

    Object.entries(value).forEach(([key, val]) => {
      if (typeof val === 'string') {
        const specialCharCount = (val.match(specialCharPattern) || []).length;
        const totalLength = val.length;

        if (totalLength > 0 && specialCharCount / totalLength > 0.1) {
          this.logger.warn('특수 문자가 많은 의심스러운 입력', {
            field: key,
            specialCharRatio: specialCharCount / totalLength,
            value: `${val.substring(0, 50)}...`,
          });

          throw new BadRequestException({
            message: '부적절한 입력 형식',
            error: `${key}에 특수 문자가 너무 많이 포함되어 있습니다`,
            errorCode: 'INVALID_FORMAT',
          });
        }
      }
    });
  }

  private logSafeValue(value: any): any {
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
