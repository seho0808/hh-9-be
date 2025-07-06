import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParsePositiveIntPipe implements PipeTransform {
  transform(value: string): number {
    const trimmedValue = value.trim();

    const positiveIntegerRegex = /^(\+)?[1-9]\d*$/;

    if (!positiveIntegerRegex.test(trimmedValue)) {
      throw new BadRequestException('Only positive integers are allowed');
    }

    const parsed = Number(trimmedValue);

    if (parsed > Number.MAX_SAFE_INTEGER) {
      throw new BadRequestException('Number exceeds maximum safe integer');
    }

    return parsed;
  }
}
