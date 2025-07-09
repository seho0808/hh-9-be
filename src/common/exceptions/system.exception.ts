import { HttpException, HttpStatus } from '@nestjs/common';

export class SystemException extends HttpException {
  constructor(message: string = '시스템 내부 오류가 발생했습니다.') {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal System Error',
        message,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class InvalidPointRangeException extends SystemException {
  constructor() {
    super('비정상 포인트 범위');
  }
}
