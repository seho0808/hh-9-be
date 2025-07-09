import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Validation Error',
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
