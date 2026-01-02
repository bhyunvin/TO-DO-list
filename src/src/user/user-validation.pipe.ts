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
          this.logger.error('Potential SQL injection attempt detected', {
            field: fieldName,
            pattern: pattern.toString(),
            value: `${fieldValue.substring(0, 50)}...`,
          });

          throw new BadRequestException({
            message: 'Invalid input detected',
            error: `${fieldName} contains invalid characters`,
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
          this.logger.warn(
            'Suspicious input with high special character ratio',
            {
              field: key,
              specialCharRatio: specialCharCount / totalLength,
              value: `${val.substring(0, 50)}...`,
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
