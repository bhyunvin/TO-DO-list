import { Injectable } from '@nestjs/common';

/**
 * Utility service for sanitizing user inputs to prevent security vulnerabilities
 */
@Injectable()
export class InputSanitizerService {
  /**
   * Sanitizes string input by removing potentially dangerous characters
   * @param input - The input string to sanitize
   * @param options - Sanitization options
   * @returns Sanitized string
   */
  sanitizeString(
    input: string,
    options: {
      allowHtml?: boolean;
      maxLength?: number;
      trimWhitespace?: boolean;
    } = {}
  ): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // Trim whitespace if requested (default: true)
    if (options.trimWhitespace !== false) {
      sanitized = sanitized.trim();
    }

    // Remove HTML tags if not allowed (default: not allowed)
    if (!options.allowHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Remove potentially dangerous characters for SQL injection prevention
    sanitized = sanitized.replace(/['"\\;]/g, '');

    // Remove script-related content for XSS prevention
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    // Limit length if specified
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  /**
   * Sanitizes email input with specific email validation rules
   * @param email - The email to sanitize
   * @returns Sanitized email string
   */
  sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    // Basic email sanitization - remove dangerous characters but preserve email format
    let sanitized = email.trim().toLowerCase();
    
    // Remove characters that are never valid in emails and could be dangerous
    sanitized = sanitized.replace(/['"\\;()<>]/g, '');
    
    // Remove script-related content
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    return sanitized;
  }

  /**
   * Sanitizes user name input
   * @param name - The name to sanitize
   * @returns Sanitized name string
   */
  sanitizeName(name: string): string {
    if (!name || typeof name !== 'string') {
      return '';
    }

    let sanitized = name.trim();
    
    // Allow letters, numbers, spaces, hyphens, apostrophes, and periods for names
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-'.]/g, '');
    
    // Remove multiple consecutive spaces
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    // Limit length for names
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200);
    }
    
    return sanitized;
  }

  /**
   * Sanitizes description/text content
   * @param description - The description to sanitize
   * @returns Sanitized description string
   */
  sanitizeDescription(description: string): string {
    if (!description || typeof description !== 'string') {
      return '';
    }

    let sanitized = description.trim();
    
    // Remove script tags and dangerous HTML
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    // Remove SQL injection attempts
    sanitized = sanitized.replace(/['"\\;]/g, '');
    
    // Limit length for descriptions
    if (sanitized.length > 4000) {
      sanitized = sanitized.substring(0, 4000);
    }
    
    return sanitized;
  }

  /**
   * Validates that a string contains only safe characters
   * @param input - The input to validate
   * @param allowedPattern - Regex pattern for allowed characters
   * @returns True if input is safe, false otherwise
   */
  isInputSafe(input: string, allowedPattern?: RegExp): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    // Default pattern allows letters, numbers, spaces, and common punctuation
    const defaultPattern = /^[a-zA-Z0-9\s\-_.@]+$/;
    const pattern = allowedPattern || defaultPattern;

    return pattern.test(input);
  }

  /**
   * Sanitizes an object by applying appropriate sanitization to each field
   * @param obj - The object to sanitize
   * @param fieldRules - Rules for sanitizing specific fields
   * @returns Sanitized object
   */
  sanitizeObject<T extends Record<string, any>>(
    obj: T,
    fieldRules: Partial<Record<keyof T, 'string' | 'email' | 'name' | 'description'>> = {}
  ): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = { ...obj } as any;

    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        const rule = fieldRules[key as keyof T];
        
        switch (rule) {
          case 'email':
            sanitized[key] = this.sanitizeEmail(value);
            break;
          case 'name':
            sanitized[key] = this.sanitizeName(value);
            break;
          case 'description':
            sanitized[key] = this.sanitizeDescription(value);
            break;
          case 'string':
          default:
            sanitized[key] = this.sanitizeString(value);
            break;
        }
      }
    }

    return sanitized;
  }
}