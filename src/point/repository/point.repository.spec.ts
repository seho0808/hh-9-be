import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { PointRepository } from './point.repository';
import { UserPointTable } from '../../database/userpoint.table';
import { PointHistoryTable } from '../../database/pointhistory.table';
import { TransactionType } from '../point.model';

describe('PointRepository', () => {
  let repository: PointRepository;
  let userPointTable: jest.Mocked<UserPointTable>;
  let pointHistoryTable: jest.Mocked<PointHistoryTable>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointRepository,
        {
          provide: UserPointTable,
          useValue: {
            selectById: jest.fn(),
            insertOrUpdate: jest.fn(),
          },
        },
        {
          provide: PointHistoryTable,
          useValue: {
            selectAllByUserId: jest.fn(),
            insert: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<PointRepository>(PointRepository);
    userPointTable = module.get(UserPointTable);
    pointHistoryTable = module.get(PointHistoryTable);
  });

  describe('getUserPoint', () => {
    it('사용자 포인트를 정상적으로 조회해야 한다', async () => {
      const userId = 1;
      const expectedUserPoint = {
        id: 1,
        point: 1000,
        updateMillis: 123456789,
      };
      userPointTable.selectById.mockResolvedValue(expectedUserPoint);

      const result = await repository.getUserPoint(userId);

      expect(result).toEqual(expectedUserPoint);
    });

    it('데이터베이스 에러 발생시 InternalServerErrorException을 발생시켜야 한다', async () => {
      const userId = 1;
      userPointTable.selectById.mockRejectedValue(new Error('Database error'));

      await expect(repository.getUserPoint(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getHistories', () => {
    it('포인트 히스토리를 정상적으로 조회해야 한다', async () => {
      const userId = 1;
      const expectedHistories = [
        {
          id: 1,
          userId: 1,
          amount: 1000,
          type: TransactionType.CHARGE,
          timeMillis: 123456789,
        },
        {
          id: 2,
          userId: 1,
          amount: 500,
          type: TransactionType.USE,
          timeMillis: 123456790,
        },
      ];
      pointHistoryTable.selectAllByUserId.mockResolvedValue(expectedHistories);

      const result = await repository.getHistories(userId);

      expect(result).toEqual(expectedHistories);
    });

    it('데이터베이스 에러 발생시 InternalServerErrorException을 발생시켜야 한다', async () => {
      const userId = 1;
      pointHistoryTable.selectAllByUserId.mockRejectedValue(new Error('Database error'));

      await expect(repository.getHistories(userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updatePointWithHistory', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(123456789);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('포인트 업데이트와 히스토리 기록을 정상적으로 수행해야 한다', async () => {
      // Given
      const userId = 1;
      const newPoint = 1500;
      const amount = 500;
      const type = TransactionType.CHARGE;
      const expectedUserPoint = {
        id: 1,
        point: 1500,
        updateMillis: 123456789,
      };

      userPointTable.insertOrUpdate.mockResolvedValue(expectedUserPoint);
      pointHistoryTable.insert.mockResolvedValue({
        id: 1,
        userId: 1,
        amount: 500,
        type: TransactionType.CHARGE,
        timeMillis: 123456789,
      });

      expect(pointHistoryTable.insert).toHaveBeenCalledWith(
        userId,
        amount,
        type,
        123456789,
      );

      const result = await repository.updatePointWithHistory(
        userId,
        newPoint,
        amount,
        type,
      );

      expect(result).toEqual(expectedUserPoint);
    });

    it('데이터베이스 에러 발생시 InternalServerErrorException을 발생시켜야 한다', async () => {
      // Given
      const userId = 1;
      const newPoint = 1500;
      const amount = 500;
      const type = TransactionType.CHARGE;

      userPointTable.insertOrUpdate.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.updatePointWithHistory(userId, newPoint, amount, type),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
