import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  ValidationPipe,
} from '@nestjs/common';
import { PointHistory, TransactionType, UserPoint } from './point.model';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { PointBody as PointDto } from './point.dto';
import { ParsePositiveIntPipe } from 'src/common/pipes/parse-positive-int.pipe';

@Controller('/point')
export class PointController {
  constructor(
    private readonly userDb: UserPointTable,
    private readonly historyDb: PointHistoryTable,
  ) {}

  @Get(':id')
  async point(@Param('id', ParsePositiveIntPipe) id: number): Promise<UserPoint> {
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

  @Get(':id/histories')
  async history(@Param('id', ParsePositiveIntPipe) id: number): Promise<PointHistory[]> {
    let histories: PointHistory[];
    try {
      histories = await this.historyDb.selectAllByUserId(id);
    } catch (error) {
      throw new InternalServerErrorException();
    }

    histories.sort((a, b) => b.timeMillis - a.timeMillis);

    return histories;
  }

  @Patch(':id/charge')
  async charge(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body(ValidationPipe) pointDto: PointDto,
  ): Promise<UserPoint> {
    // TODO: 추후 서비스 레이어로 리팩토링 시 여러개의 함수로 분리해야 함
    const amount = pointDto.amount;
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

  /**
   * TODO - 특정 유저의 포인트를 사용하는 기능을 작성해주세요.
   */
  @Patch(':id/use')
  async use(
    @Param('id') id,
    @Body(ValidationPipe) pointDto: PointDto,
  ): Promise<UserPoint> {
    const userId = Number.parseInt(id);
    const amount = pointDto.amount;
    return { id: userId, point: amount, updateMillis: Date.now() };
  }
}
