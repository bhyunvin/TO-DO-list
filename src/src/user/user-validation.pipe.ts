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
 * Custom validation pipe for user profile updates with enhanced security
 */
@Injectable()
export class UserProfileValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(UserProfileValidationPipe.name);
  private readonly inputSanitizer = new InputSanitizerService();

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Sanitize input before validation
    const sanitizedValue = this.sanitizeInput(value);

    // Transform to class instance
    const object = plainToClass(metatype, sanitizedValue);

    // Validate using class-validator decorators
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

    // Additional security checks
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

    // Sanitize each field based on its purpose
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
    // Check for potential SQL injection patterns
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

    // Check each field for security violations
    if (value.userName) {
      checkValue(value.userName, 'userName');
    }

    if (value.userEmail) {
      checkValue(value.userEmail, 'userEmail');
    }

    if (value.userDescription) {
      checkValue(value.userDescription, 'userDescription');
    }

    // Check for excessive special characters that might indicate an attack
    const specialCharPattern = /[<>{}[\]\\\/\$\^]/g;

    Object.entries(value).forEach(([key, val]) => {
      if (typeof val === 'string') {
        const specialCharCount = (val.match(specialCharPattern) || []).length;
        const totalLength = val.length;

        // If more than 10% of characters are special characters, flag as suspicious
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
    // Create a safe version for logging (truncate long strings)
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
