import { Injectable } from '@nestjs/common';
import { PointHistory, TransactionType, UserPoint } from '../point.model';
import { PointPolicy } from './policy/point.policy';
import { PointRepository } from '../repository/point.repository';

@Injectable()
export class PointService {
  constructor(
    private readonly policy: PointPolicy,
    private readonly repository: PointRepository,
  ) {}

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
    this.policy.checkChargeAmount(amount);

    const currentPoint = await this.repository.getUserPoint(id);
    this.policy.checkChargeLimit(currentPoint.point, amount);

    const newPoint = currentPoint.point + amount;
    return await this.repository.updatePointWithHistory(
      id,
      newPoint,
      amount,
      TransactionType.CHARGE,
    );
  }

  async usePoint(id: number, amount: number): Promise<UserPoint> {
    this.policy.checkUseAmount(amount);

    const currentPoint = await this.repository.getUserPoint(id);
    const histories = await this.repository.getHistories(id);

    const pointsUsedToday = this.calculateDailyUsedPoints(histories);
    this.policy.checkDailyUseLimit(pointsUsedToday, amount);
    this.policy.checkSufficientBalance(currentPoint.point, amount);

    const newPoint = currentPoint.point - amount;
    return await this.repository.updatePointWithHistory(
      id,
      newPoint,
      amount,
      TransactionType.USE,
    );
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
