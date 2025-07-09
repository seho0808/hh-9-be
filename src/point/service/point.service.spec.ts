import { Test, TestingModule } from '@nestjs/testing';
import { PointService } from './point.service';
import {
  InvalidChargeAmountException,
  PointLimitExceededException,
  InvalidUseAmountException,
  DailyUseLimitExceededException,
  InsufficientBalanceException,
  InvalidPointRangeException,
  SystemException,
} from 'src/common/exceptions';
import { TransactionType } from '../point.model';
import { PointPolicy } from './policy/point.policy';
import { PointRepository } from '../point.repository';

describe('PointService', () => {
  let service: PointService;
  let pointRepository: PointRepository;

  beforeEach(async () => {
    jest.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointService,
        PointPolicy,
        {
          provide: PointRepository,
          useValue: {
            getUserPoint: jest.fn(),
            getHistories: jest.fn(),
            updatePointWithHistory: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PointService>(PointService);
    pointRepository = module.get<PointRepository>(PointRepository);
  });

  describe('getPoint', () => {
    it('포인트가 100일 경우 정상적으로 반환되어야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 100,
        updateMillis: 123456789,
      });

      const result = await service.getPoint(1);

      expect(result).toEqual({
        id: 1,
        point: 100,
        updateMillis: 123456789,
      });
    });

    it('포인트가 0일 경우에도 정상 반환되어야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 0,
        updateMillis: 123456789,
      });

      const result = await service.getPoint(1);

      expect(result).toEqual({
        id: 1,
        point: 0,
        updateMillis: 123456789,
      });
    });

    it('포인트가 최대 허용값(10,000,000)일 때도 정상 반환되어야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 10_000_000,
        updateMillis: 123456789,
      });

      const result = await service.getPoint(1);

      expect(result).toEqual({
        id: 1,
        point: 10_000_000,
        updateMillis: 123456789,
      });
    });

    it('포인트가 음수일 경우 500 에러가 발생해야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: -1,
        updateMillis: 123456789,
      });

      await expect(service.getPoint(1)).rejects.toThrow(InvalidPointRangeException);
    });

    it('포인트가 최대 허용값 초과 시 500 에러가 발생해야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 10_000_001,
        updateMillis: 123456789,
      });

      await expect(service.getPoint(1)).rejects.toThrow(InvalidPointRangeException);
    });

    it('Repository에서 예외가 발생하면 SystemException이 발생해야 한다', async () => {
      jest
        .spyOn(pointRepository, 'getUserPoint')
        .mockRejectedValue(new SystemException());

      await expect(service.getPoint(1)).rejects.toThrow(SystemException);
    });
  });

  describe('getHistory', () => {
    it('포인트 내역이 정상적으로 반환되어야 한다', async () => {
      const mockedPointHistory = {
        id: 1,
        userId: 1,
        amount: 100,
        type: TransactionType.CHARGE,
        timeMillis: 123456789,
      };
      jest.spyOn(pointRepository, 'getHistories').mockResolvedValue([mockedPointHistory]);

      const result = await service.getHistory(1);

      expect(result).toEqual([mockedPointHistory]);
    });

    it('포인트 내역이 최신순으로 정렬되어 반환되어야 한다', async () => {
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
        .spyOn(pointRepository, 'getHistories')
        .mockResolvedValue([mockedPointHistory1, mockedPointHistory2]);

      const result = await service.getHistory(1);

      expect(result).toEqual([mockedPointHistory2, mockedPointHistory1]);
    });

    it('Repository에서 예외가 발생하면 SystemException이 발생해야 한다', async () => {
      jest
        .spyOn(pointRepository, 'getHistories')
        .mockRejectedValue(new SystemException());

      await expect(service.getHistory(1)).rejects.toThrow(SystemException);
    });
  });

  describe('chargePoint', () => {
    it('포인트가 정상적으로 충전되어야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 100,
        updateMillis: 123456789,
      });
      jest.spyOn(pointRepository, 'updatePointWithHistory').mockResolvedValue({
        id: 1,
        point: 200,
        updateMillis: 123456789,
      });
      jest.spyOn(Date, 'now').mockReturnValue(123456789);

      await service.chargePoint(1, 100);

      expect(pointRepository.updatePointWithHistory).toHaveBeenCalledWith(
        1,
        200,
        100,
        TransactionType.CHARGE,
      );
    });

    it('최소 충전 금액이 정상적으로 충전되어야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 100,
        updateMillis: 123456789,
      });
      jest.spyOn(pointRepository, 'updatePointWithHistory').mockResolvedValue({
        id: 1,
        point: 101,
        updateMillis: 123456789,
      });
      jest.spyOn(Date, 'now').mockReturnValue(123456789);

      await service.chargePoint(1, 1);

      expect(pointRepository.updatePointWithHistory).toHaveBeenCalledWith(
        1,
        101,
        1,
        TransactionType.CHARGE,
      );
    });

    it('최대 충전 금액이 정상적으로 충전되어야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 0,
        updateMillis: 123456789,
      });
      jest.spyOn(pointRepository, 'updatePointWithHistory').mockResolvedValue({
        id: 1,
        point: 10_000_000,
        updateMillis: 123456789,
      });
      jest.spyOn(Date, 'now').mockReturnValue(123456789);

      await service.chargePoint(1, 10_000_000);

      expect(pointRepository.updatePointWithHistory).toHaveBeenCalledWith(
        1,
        10_000_000,
        10_000_000,
        TransactionType.CHARGE,
      );
    });

    it('충전 후 총 포인트가 10,000,000P 초과 시 400 에러가 발생해야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 10_000_000,
        updateMillis: 123456789,
      });

      await expect(service.chargePoint(1, 1)).rejects.toThrow(
        PointLimitExceededException,
      );
    });

    it('포인트가 최소 충전 가능 포인트보다 작을 경우 400 에러가 발생해야 한다', async () => {
      await expect(service.chargePoint(1, -1)).rejects.toThrow(
        InvalidChargeAmountException,
      );
      await expect(service.chargePoint(1, 0)).rejects.toThrow(
        InvalidChargeAmountException,
      );
    });

    it('Repository에서 예외가 발생하면 SystemException이 발생해야 한다', async () => {
      jest
        .spyOn(pointRepository, 'getUserPoint')
        .mockRejectedValue(new SystemException());

      await expect(service.chargePoint(1, 100)).rejects.toThrow(SystemException);
    });
  });

  describe('usePoint', () => {
    it('포인트가 정상적으로 사용되어야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 1000,
        updateMillis: 123456789,
      });
      jest.spyOn(pointRepository, 'getHistories').mockResolvedValue([]);
      jest.spyOn(pointRepository, 'updatePointWithHistory').mockResolvedValue({
        id: 1,
        point: 900,
        updateMillis: 123456789,
      });
      jest.spyOn(Date, 'now').mockReturnValue(123456789);

      await service.usePoint(1, 100);

      expect(pointRepository.updatePointWithHistory).toHaveBeenCalledWith(
        1,
        900,
        100,
        TransactionType.USE,
      );
    });

    it('최소 사용 단위(100P) 금액이 정상적으로 사용되어야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 100,
        updateMillis: 123456789,
      });
      jest.spyOn(pointRepository, 'getHistories').mockResolvedValue([]);
      jest.spyOn(pointRepository, 'updatePointWithHistory').mockResolvedValue({
        id: 1,
        point: 0,
        updateMillis: 123456789,
      });
      jest.spyOn(Date, 'now').mockReturnValue(123456789);

      await service.usePoint(1, 100);

      expect(pointRepository.updatePointWithHistory).toHaveBeenCalledWith(
        1,
        0,
        100,
        TransactionType.USE,
      );
    });

    it('최대 사용 금액(10,000P)이 정상적으로 사용되어야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 5_000_000,
        updateMillis: 123456789,
      });
      jest.spyOn(pointRepository, 'getHistories').mockResolvedValue([]);
      jest.spyOn(pointRepository, 'updatePointWithHistory').mockResolvedValue({
        id: 1,
        point: 4_990_000,
        updateMillis: 123456789,
      });
      jest.spyOn(Date, 'now').mockReturnValue(123456789);

      await service.usePoint(1, 10_000);

      expect(pointRepository.updatePointWithHistory).toHaveBeenCalledWith(
        1,
        4_990_000,
        10_000,
        TransactionType.USE,
      );
    });

    it('포인트가 최소 사용 단위(100P)보다 작을 경우 400 에러가 발생해야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 1000,
        updateMillis: 123456789,
      });

      await expect(service.usePoint(1, 99)).rejects.toThrow(InvalidUseAmountException);
      await expect(service.usePoint(1, 0)).rejects.toThrow(InvalidUseAmountException);
      await expect(service.usePoint(1, -1)).rejects.toThrow(InvalidUseAmountException);
      await expect(service.usePoint(1, 101)).rejects.toThrow(InvalidUseAmountException);
    });

    it('포인트 사용 후 포인트가 음수가 될 경우 400 에러가 발생해야 한다', async () => {
      jest.spyOn(pointRepository, 'getHistories').mockResolvedValue([]);
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 100,
        updateMillis: 123456789,
      });

      await expect(service.usePoint(1, 200)).rejects.toThrow(
        InsufficientBalanceException,
      );
    });

    it('하루 최대 사용 가능 포인트를 초과할 경우 400 에러가 발생해야 한다', async () => {
      jest.spyOn(pointRepository, 'getUserPoint').mockResolvedValue({
        id: 1,
        point: 100000,
        updateMillis: 123456789,
      });

      jest.spyOn(pointRepository, 'getHistories').mockResolvedValue([
        {
          id: 1,
          userId: 1,
          amount: 30000,
          type: TransactionType.USE,
          timeMillis: Date.now(),
        },
        {
          id: 2,
          userId: 1,
          amount: 20000,
          type: TransactionType.USE,
          timeMillis: Date.now(),
        },
      ]);

      // 이미 50000P를 사용했으므로 추가 사용 불가
      await expect(service.usePoint(1, 100)).rejects.toThrow(
        DailyUseLimitExceededException,
      );
    });

    it('Repository에서 예외가 발생하면 SystemException이 발생해야 한다', async () => {
      jest
        .spyOn(pointRepository, 'getUserPoint')
        .mockRejectedValue(new SystemException());

      await expect(service.usePoint(1, 100)).rejects.toThrow(SystemException);
    });
  });
});
