import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PointHistory, TransactionType, UserPoint } from './point.model';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';

@Injectable()
export class PointRepository {
  constructor(
    private readonly userDb: UserPointTable,
    private readonly historyDb: PointHistoryTable,
  ) {}

  async getUserPoint(id: number): Promise<UserPoint> {
    try {
      return await this.userDb.selectById(id);
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async getHistories(id: number): Promise<PointHistory[]> {
    try {
      return await this.historyDb.selectAllByUserId(id);
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async updatePointWithHistory(
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
}
