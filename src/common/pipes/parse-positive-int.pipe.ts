import { PipeTransform, Injectable } from '@nestjs/common';
import { ValidationException } from '../exceptions';

@Injectable()
export class ParsePositiveIntPipe implements PipeTransform {
  transform(value: string): number {
    const trimmedValue = value.trim();

    const positiveIntegerRegex = /^(\+)?[1-9]\d*$/;

    if (!positiveIntegerRegex.test(trimmedValue)) {
      throw new ValidationException('Only positive integers are allowed');
    }

    const parsed = Number(trimmedValue);

    if (parsed > Number.MAX_SAFE_INTEGER) {
      throw new ValidationException('Number exceeds maximum safe integer');
    }

    return parsed;
  }
}
