import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PointHistory, TransactionType, UserPoint } from './point.model';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';

@Injectable()
export class PointService {
  private static readonly MAX_POINT_LIMIT = 10_000_000;
  private static readonly DAILY_USE_LIMIT = 50_000;
  private static readonly MIN_USE_AMOUNT = 100;
  private static readonly USE_AMOUNT_UNIT = 100;

  constructor(
    private readonly userDb: UserPointTable,
    private readonly historyDb: PointHistoryTable,
  ) {}

  async getPoint(id: number): Promise<UserPoint> {
    const userPoint = await this.getUserPointSafely(id);
    this.validatePointRange(userPoint.point);
    return userPoint;
  }

  async getHistory(id: number): Promise<PointHistory[]> {
    const histories = await this.getHistoriesSafely(id);
    return this.sortHistoriesByTimeDesc(histories);
  }

  async chargePoint(id: number, amount: number): Promise<UserPoint> {
    this.validateChargeAmount(amount);

    const currentPoint = await this.getUserPointSafely(id);
    this.validateChargeLimit(currentPoint.point, amount);

    const newPoint = currentPoint.point + amount;
    return await this.updatePointWithHistory(
      id,
      newPoint,
      amount,
      TransactionType.CHARGE,
    );
  }

  async usePoint(id: number, amount: number): Promise<UserPoint> {
    this.validateUseAmount(amount);

    const currentPoint = await this.getUserPointSafely(id);
    await this.validateDailyUseLimit(id, amount);
    this.validateSufficientBalance(currentPoint.point, amount);

    const newPoint = currentPoint.point - amount;
    return await this.updatePointWithHistory(id, newPoint, amount, TransactionType.USE);
  }

  private validatePointRange(point: number): void {
    if (point < 0 || point > PointService.MAX_POINT_LIMIT) {
      throw new InternalServerErrorException();
    }
  }

  private validateChargeAmount(amount: number): void {
    if (amount < 1 || amount > PointService.MAX_POINT_LIMIT) {
      throw new BadRequestException();
    }
  }

  private validateChargeLimit(currentPoint: number, amount: number): void {
    if (currentPoint + amount > PointService.MAX_POINT_LIMIT) {
      throw new BadRequestException();
    }
  }

  private validateUseAmount(amount: number): void {
    if (
      amount < PointService.MIN_USE_AMOUNT ||
      amount > PointService.MAX_POINT_LIMIT ||
      amount % PointService.USE_AMOUNT_UNIT !== 0
    ) {
      throw new BadRequestException();
    }
  }

  private async validateDailyUseLimit(id: number, amount: number): Promise<void> {
    const histories = await this.getHistoriesSafely(id);
    const pointsUsedToday = this.calculateDailyUsedPoints(histories);

    if (pointsUsedToday + amount > PointService.DAILY_USE_LIMIT) {
      throw new BadRequestException();
    }
  }

  private validateSufficientBalance(currentPoint: number, amount: number): void {
    if (currentPoint < amount) {
      throw new BadRequestException();
    }
  }

  private async getUserPointSafely(id: number): Promise<UserPoint> {
    try {
      return await this.userDb.selectById(id);
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  private async getHistoriesSafely(id: number): Promise<PointHistory[]> {
    try {
      return await this.historyDb.selectAllByUserId(id);
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  private async updatePointWithHistory(
    id: number,
    newPoint: number,
    amount: number,
    type: TransactionType,
  ): Promise<UserPoint> {
    try {
      const updatedPoint = await this.userDb.insertOrUpdate(id, newPoint);
      await this.historyDb.insert(id, amount, type, Date.now());
      return updatedPoint;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  private sortHistoriesByTimeDesc(histories: PointHistory[]): PointHistory[] {
    return histories.sort((a, b) => b.timeMillis - a.timeMillis);
  }

  private calculateDailyUsedPoints(histories: PointHistory[]): number {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    return histories
      .filter(
        history => history.type === TransactionType.USE && history.timeMillis > oneDayAgo,
      )
      .reduce((acc, history) => acc + history.amount, 0);
  }
}
