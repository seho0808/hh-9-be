import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Business Logic Error',
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidChargeAmountException extends BusinessException {
  constructor() {
    super('충전 금액이 유효하지 않습니다.');
  }
}

export class PointLimitExceededException extends BusinessException {
  constructor() {
    super('포인트 한도 초과');
  }
}

export class InvalidUseAmountException extends BusinessException {
  constructor() {
    super('포인트 사용 단위 오류');
  }
}

export class DailyUseLimitExceededException extends BusinessException {
  constructor() {
    super('일일 사용 한도 초과');
  }
}

export class InsufficientBalanceException extends BusinessException {
  constructor() {
    super('잔액 부족');
  }
}
