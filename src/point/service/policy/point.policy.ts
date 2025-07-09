import { Injectable } from '@nestjs/common';
import {
  InvalidChargeAmountException,
  PointLimitExceededException,
  InvalidUseAmountException,
  DailyUseLimitExceededException,
  InsufficientBalanceException,
  InvalidPointRangeException,
} from 'src/common/exceptions';

@Injectable()
export class PointPolicy {
  public static readonly MAX_POINT_LIMIT = 10_000_000;
  public static readonly DAILY_USE_LIMIT = 50_000;
  public static readonly MIN_USE_AMOUNT = 100;
  public static readonly USE_AMOUNT_UNIT = 100;

  checkPointRange(point: number): void {
    if (point < 0 || point > PointPolicy.MAX_POINT_LIMIT) {
      throw new InvalidPointRangeException();
    }
  }

  checkChargeAmount(amount: number): void {
    if (amount < 1 || amount > PointPolicy.MAX_POINT_LIMIT) {
      throw new InvalidChargeAmountException();
    }
  }

  checkChargeLimit(currentPoint: number, amount: number): void {
    if (currentPoint + amount > PointPolicy.MAX_POINT_LIMIT) {
      throw new PointLimitExceededException();
    }
  }

  checkUseAmount(amount: number): void {
    if (
      amount < PointPolicy.MIN_USE_AMOUNT ||
      amount > PointPolicy.MAX_POINT_LIMIT ||
      amount % PointPolicy.USE_AMOUNT_UNIT !== 0
    ) {
      throw new InvalidUseAmountException();
    }
  }

  checkDailyUseLimit(pointsUsedToday: number, amount: number): void {
    if (pointsUsedToday + amount > PointPolicy.DAILY_USE_LIMIT) {
      throw new DailyUseLimitExceededException();
    }
  }

  checkSufficientBalance(currentPoint: number, amount: number): void {
    if (currentPoint < amount) {
      throw new InsufficientBalanceException();
    }
  }
}
