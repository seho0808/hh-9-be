import { Injectable } from '@nestjs/common';
import { Mutex } from 'async-mutex';
import { PointHistory, TransactionType, UserPoint } from '../point.model';
import { PointPolicy } from './policy/point.policy';
import { PointRepository } from '../point.repository';

@Injectable()
export class PointService {
  private readonly userMutexes = new Map<number, Mutex>();

  constructor(
    private readonly policy: PointPolicy,
    private readonly repository: PointRepository,
  ) {}

  private getMutex(userId: number): Mutex {
    if (!this.userMutexes.has(userId)) {
      this.userMutexes.set(userId, new Mutex());
    }
    return this.userMutexes.get(userId)!;
  }

  async getPoint(id: number): Promise<UserPoint> {
    const userPoint = await this.repository.getUserPoint(id);
    this.policy.checkPointRange(userPoint.point);
    return userPoint;
  }

  async getHistory(id: number): Promise<PointHistory[]> {
    const histories = await this.repository.getHistories(id);
    return histories.sort((a, b) => b.timeMillis - a.timeMillis);
  }

  async chargePoint(id: number, amount: number): Promise<UserPoint> {
    const mutex = this.getMutex(id);

    return mutex.runExclusive(async () => {
      this.policy.checkChargeAmount(amount);

      const userPoint = await this.repository.getUserPoint(id);
      this.policy.checkChargeLimit(userPoint.point, amount);

      const newPoint = userPoint.point + amount;
      return await this.repository.updatePointWithHistory(
        id,
        newPoint,
        amount,
        TransactionType.CHARGE,
      );
    });
  }

  async usePoint(id: number, amount: number): Promise<UserPoint> {
    const mutex = this.getMutex(id);

    return mutex.runExclusive(async () => {
      this.policy.checkUseAmount(amount);

      const userPoint = await this.repository.getUserPoint(id);
      this.policy.checkSufficientBalance(userPoint.point, amount);

      const histories = await this.repository.getHistories(id);
      const pointsUsedToday = this.calculateDailyUsedPoints(histories);
      this.policy.checkDailyUseLimit(pointsUsedToday, amount);

      const newPoint = userPoint.point - amount;
      return await this.repository.updatePointWithHistory(
        id,
        newPoint,
        amount,
        TransactionType.USE,
      );
    });
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
