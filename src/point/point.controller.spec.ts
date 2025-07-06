import { Test, TestingModule } from '@nestjs/testing';
import { PointController } from './point.controller';
import { UserPointTable } from '../database/userpoint.table';
import { PointHistoryTable } from '../database/pointhistory.table';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

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

        const result = await controller.point('1');

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

        const result = await controller.point('1');

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

        const result = await controller.point('1');

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

        await expect(controller.point('1')).rejects.toThrow(InternalServerErrorException);
      });

      it('포인트가 최대 허용값 초과 시 500 에러 발생', async () => {
        jest.spyOn(userPointTable, 'selectById').mockResolvedValue({
          id: 1,
          point: 10_000_001,
          updateMillis: 123456789,
        });

        await expect(controller.point('1')).rejects.toThrow(InternalServerErrorException);
      });
    });

    describe('❌ 입력 유효성 검사 (Validation)', () => {
      it('id가 숫자가 아닐 경우 400 에러 발생', async () => {
        await expect(controller.point('abc')).rejects.toThrow(BadRequestException);
      });

      it('id가 음수일 경우 400 에러 발생', async () => {
        await expect(controller.point('-1')).rejects.toThrow(BadRequestException);
      });

      it('id가 0일 경우 400 에러 발생', async () => {
        await expect(controller.point('0')).rejects.toThrow(BadRequestException);
      });

      it('id가 빈 문자열일 경우 400 에러 발생', async () => {
        await expect(controller.point('')).rejects.toThrow(BadRequestException);
      });

      it('id가 문자열이 아닐 경우 400 에러 발생', async () => {
        await expect(controller.point(1)).rejects.toThrow(BadRequestException);
      });

      it('id가 null일 경우 400 에러 발생', async () => {
        await expect(controller.point(null)).rejects.toThrow(BadRequestException);
      });

      it('id가 undefined일 경우 400 에러 발생', async () => {
        await expect(controller.point(undefined)).rejects.toThrow(BadRequestException);
      });
    });

    describe('💥 시스템 예외 (Unexpected Errors)', () => {
      it('DB에서 예외가 발생하면 InternalServerError 발생', async () => {
        jest.spyOn(userPointTable, 'selectById').mockRejectedValue(new Error('DB error'));

        await expect(controller.point('1')).rejects.toThrow(InternalServerErrorException);
      });
    });
  });
});
