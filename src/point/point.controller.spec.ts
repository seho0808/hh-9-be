import { Test, TestingModule } from '@nestjs/testing';
import { PointController } from './point.controller';
import { UserPointTable } from '../database/userpoint.table';
import { PointHistoryTable } from '../database/pointhistory.table';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { TransactionType } from './point.model';

describe('PointController', () => {
  let controller: PointController;
  let userPointTable: UserPointTable;
  let pointHistoryTable: PointHistoryTable;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointController],
      providers: [
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
            insert: jest.fn(),
            selectAllByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PointController>(PointController);
    userPointTable = module.get<UserPointTable>(UserPointTable);
    pointHistoryTable = module.get<PointHistoryTable>(PointHistoryTable);
  });

  describe('GET /point/:id', () => {
    describe('😊 정상 작동 (Happy Path & Passing Edge Cases)', () => {
      it('포인트가 100일 경우 정상적으로 반환됨', async () => {
        jest.spyOn(userPointTable, 'selectById').mockResolvedValue({
          id: 1,
          point: 100,
          updateMillis: 123456789,
        });

        const result = await controller.point(1);

        expect(result).toEqual({
          id: 1,
          point: 100,
          updateMillis: 123456789,
        });
      });

      it('포인트가 0일 경우에도 정상 반환됨', async () => {
        jest.spyOn(userPointTable, 'selectById').mockResolvedValue({
          id: 1,
          point: 0,
          updateMillis: 123456789,
        });

        const result = await controller.point(1);

        expect(result).toEqual({
          id: 1,
          point: 0,
          updateMillis: 123456789,
        });
      });

      it('포인트가 최대 허용값(10,000,000)일 때도 정상 반환됨', async () => {
        jest.spyOn(userPointTable, 'selectById').mockResolvedValue({
          id: 1,
          point: 10_000_000,
          updateMillis: 123456789,
        });

        const result = await controller.point(1);

        expect(result).toEqual({
          id: 1,
          point: 10_000_000,
          updateMillis: 123456789,
        });
      });
    });

    describe('💼 정책 예외 (Business Rule Violation)', () => {
      it('포인트가 음수일 경우 500 에러 발생', async () => {
        jest.spyOn(userPointTable, 'selectById').mockResolvedValue({
          id: 1,
          point: -1,
          updateMillis: 123456789,
        });

        await expect(controller.point(1)).rejects.toThrow(InternalServerErrorException);
      });

      it('포인트가 최대 허용값 초과 시 500 에러 발생', async () => {
        jest.spyOn(userPointTable, 'selectById').mockResolvedValue({
          id: 1,
          point: 10_000_001,
          updateMillis: 123456789,
        });

        await expect(controller.point(1)).rejects.toThrow(InternalServerErrorException);
      });
    });

    describe('💥 시스템 예외 (Unexpected Errors)', () => {
      it('DB에서 예외가 발생하면 InternalServerError 발생', async () => {
        jest.spyOn(userPointTable, 'selectById').mockRejectedValue(new Error('DB error'));

        await expect(controller.point(1)).rejects.toThrow(InternalServerErrorException);
      });
    });
  });

  describe('GET /point/:id/histories', () => {
    describe('😊 정상 작동 (Happy Path & Passing Edge Cases)', () => {
      it('포인트 내역이 정상적으로 반환됨', async () => {
        const mockedPointHistory = {
          id: 1,
          userId: 1,
          amount: 100,
          type: TransactionType.CHARGE,
          timeMillis: 123456789,
        };
        jest
          .spyOn(pointHistoryTable, 'selectAllByUserId')
          .mockResolvedValue([mockedPointHistory]);

        const result = await controller.history(1);

        expect(result).toEqual([mockedPointHistory]);
      });

      it('포인트 내역이 최신순으로 정렬되어 반환됨', async () => {
        const mockedPointHistory1 = {
          id: 1,
          userId: 1,
          amount: 100,
          type: TransactionType.CHARGE,
          timeMillis: 123456788,
        };
        const mockedPointHistory2 = {
          id: 2,
          userId: 1,
          amount: 100,
          type: TransactionType.CHARGE,
          timeMillis: 123456789,
        };
        jest
          .spyOn(pointHistoryTable, 'selectAllByUserId')
          .mockResolvedValue([mockedPointHistory1, mockedPointHistory2]);

        const result = await controller.history(1);

        expect(result).toEqual([mockedPointHistory2, mockedPointHistory1]);
      });
    });

    describe('💥 시스템 예외 (Unexpected Errors)', () => {
      it('DB에서 예외가 발생하면 InternalServerError 발생', async () => {
        jest
          .spyOn(pointHistoryTable, 'selectAllByUserId')
          .mockRejectedValue(new Error('DB error'));

        await expect(controller.history(1)).rejects.toThrow(InternalServerErrorException);
      });
    });
  });
});
