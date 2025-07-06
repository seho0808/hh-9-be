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
  constructor(
    private readonly userDb: UserPointTable,
    private readonly historyDb: PointHistoryTable,
  ) {}

  async getPoint(id: number): Promise<UserPoint> {
    let userPoint: UserPoint;

    try {
      userPoint = await this.userDb.selectById(id);
    } catch (error) {
      throw new InternalServerErrorException();
    }

    if (userPoint.point < 0 || userPoint.point > 10_000_000) {
      throw new InternalServerErrorException();
    }

    return userPoint;
  }

  async getHistory(id: number): Promise<PointHistory[]> {
    let histories: PointHistory[];
    try {
      histories = await this.historyDb.selectAllByUserId(id);
    } catch (error) {
      throw new InternalServerErrorException();
    }

    histories.sort((a, b) => b.timeMillis - a.timeMillis);

    return histories;
  }

  // TODO: 함수 분리 리팩토링
  async chargePoint(id: number, amount: number): Promise<UserPoint> {
    if (amount < 1 || amount > 10_000_000) {
      throw new BadRequestException();
    }

    let currentPoint: UserPoint;

    try {
      currentPoint = await this.userDb.selectById(id);
    } catch (error) {
      throw new InternalServerErrorException();
    }

    const newPoint = currentPoint.point + amount;

    if (newPoint > 10_000_000) {
      throw new BadRequestException();
    }

    let updatedPoint: UserPoint;

    try {
      updatedPoint = await this.userDb.insertOrUpdate(id, newPoint);
      await this.historyDb.insert(id, amount, TransactionType.CHARGE, Date.now());
    } catch (error) {
      throw new InternalServerErrorException();
    }

    return updatedPoint;
  }

  // TODO: 함수 분리 리팩토링
  async usePoint(id: number, amount: number): Promise<UserPoint> {
    if (amount < 100 || amount > 10_000_000 || amount % 100 !== 0) {
      throw new BadRequestException();
    }

    let currentPoint: UserPoint;
    let histories: PointHistory[];

    try {
      currentPoint = await this.userDb.selectById(id);
      histories = await this.historyDb.selectAllByUserId(id);
    } catch (error) {
      throw new InternalServerErrorException();
    }

    const pointsUsedToday = histories
      .filter(
        history =>
          history.type === TransactionType.USE &&
          history.timeMillis > Date.now() - 24 * 60 * 60 * 1000,
      )
      .reduce((acc, history) => acc + history.amount, 0);
    const newPointsUsedToday = pointsUsedToday + amount;

    if (newPointsUsedToday > 50000) {
      throw new BadRequestException();
    }

    const newPoint = currentPoint.point - amount;

    if (newPoint < 0) {
      throw new BadRequestException();
    }

    let updatedPoint: UserPoint;

    try {
      updatedPoint = await this.userDb.insertOrUpdate(id, newPoint);
      await this.historyDb.insert(id, amount, TransactionType.USE, Date.now());
    } catch (error) {
      throw new InternalServerErrorException();
    }

    return updatedPoint;
  }
}
