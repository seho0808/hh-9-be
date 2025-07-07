import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class PointPolicy {
  public static readonly MAX_POINT_LIMIT = 10_000_000;
  public static readonly DAILY_USE_LIMIT = 50_000;
  public static readonly MIN_USE_AMOUNT = 100;
  public static readonly USE_AMOUNT_UNIT = 100;

  checkPointRange(point: number): void {
    if (point < 0 || point > PointPolicy.MAX_POINT_LIMIT) {
      throw new InternalServerErrorException('비정상 포인트 범위');
    }
  }

  checkChargeAmount(amount: number): void {
    if (amount < 1 || amount > PointPolicy.MAX_POINT_LIMIT) {
      throw new BadRequestException('충전 금액이 유효하지 않습니다.');
    }
  }

  checkChargeLimit(currentPoint: number, amount: number): void {
    if (currentPoint + amount > PointPolicy.MAX_POINT_LIMIT) {
      throw new BadRequestException('포인트 한도 초과');
    }
  }

  checkUseAmount(amount: number): void {
    if (
      amount < PointPolicy.MIN_USE_AMOUNT ||
      amount > PointPolicy.MAX_POINT_LIMIT ||
      amount % PointPolicy.USE_AMOUNT_UNIT !== 0
    ) {
      throw new BadRequestException('포인트 사용 단위 오류');
    }
  }

  checkDailyUseLimit(pointsUsedToday: number, amount: number): void {
    if (pointsUsedToday + amount > PointPolicy.DAILY_USE_LIMIT) {
      throw new BadRequestException('일일 사용 한도 초과');
    }
  }

  checkSufficientBalance(currentPoint: number, amount: number): void {
    if (currentPoint < amount) {
      throw new BadRequestException('잔액 부족');
    }
  }
}
