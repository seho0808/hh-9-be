import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PointPolicy } from './point.policy';

describe('PointPolicy', () => {
  let pointPolicy: PointPolicy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PointPolicy],
    }).compile();

    pointPolicy = module.get<PointPolicy>(PointPolicy);
  });

  describe('checkPointRange', () => {
    it('포인트가 유효한 범위(0 이상)일 때 성공해야 한다', () => {
      expect(() => pointPolicy.checkPointRange(0)).not.toThrow();
      expect(() => pointPolicy.checkPointRange(1000)).not.toThrow();
      expect(() =>
        pointPolicy.checkPointRange(PointPolicy.MAX_POINT_LIMIT),
      ).not.toThrow();
    });

    it('포인트가 0 미만일 때 예외를 발생시켜야 한다', () => {
      expect(() => pointPolicy.checkPointRange(-1)).toThrow(InternalServerErrorException);
      expect(() => pointPolicy.checkPointRange(-100)).toThrow(
        InternalServerErrorException,
      );
    });

    it('포인트가 최대 한도를 초과할 때 예외를 발생시켜야 한다', () => {
      expect(() => pointPolicy.checkPointRange(PointPolicy.MAX_POINT_LIMIT + 1)).toThrow(
        InternalServerErrorException,
      );
      expect(() => pointPolicy.checkPointRange(PointPolicy.MAX_POINT_LIMIT * 2)).toThrow(
        InternalServerErrorException,
      );
    });

    it('예외 메시지가 올바른지 확인해야 한다', () => {
      expect(() => pointPolicy.checkPointRange(-1)).toThrow('비정상 포인트 범위');
      expect(() => pointPolicy.checkPointRange(PointPolicy.MAX_POINT_LIMIT + 1)).toThrow(
        '비정상 포인트 범위',
      );
    });
  });

  describe('checkChargeAmount', () => {
    it('충전 금액이 유효한 범위(1 이상)일 때 성공해야 한다', () => {
      expect(() => pointPolicy.checkChargeAmount(1)).not.toThrow();
      expect(() => pointPolicy.checkChargeAmount(1000)).not.toThrow();
      expect(() =>
        pointPolicy.checkChargeAmount(PointPolicy.MAX_POINT_LIMIT),
      ).not.toThrow();
    });

    it('충전 금액이 1 미만일 때 예외를 발생시켜야 한다', () => {
      expect(() => pointPolicy.checkChargeAmount(0)).toThrow(BadRequestException);
      expect(() => pointPolicy.checkChargeAmount(-1)).toThrow(BadRequestException);
    });

    it('충전 금액이 최대 한도를 초과할 때 예외를 발생시켜야 한다', () => {
      expect(() =>
        pointPolicy.checkChargeAmount(PointPolicy.MAX_POINT_LIMIT + 1),
      ).toThrow(BadRequestException);
      expect(() =>
        pointPolicy.checkChargeAmount(PointPolicy.MAX_POINT_LIMIT * 2),
      ).toThrow(BadRequestException);
    });

    it('예외 메시지가 올바른지 확인해야 한다', () => {
      expect(() => pointPolicy.checkChargeAmount(0)).toThrow(
        '충전 금액이 유효하지 않습니다.',
      );
      expect(() =>
        pointPolicy.checkChargeAmount(PointPolicy.MAX_POINT_LIMIT + 1),
      ).toThrow('충전 금액이 유효하지 않습니다.');
    });
  });

  describe('checkChargeLimit', () => {
    it('충전 후 포인트가 한도 내일 때 성공해야 한다', () => {
      expect(() => pointPolicy.checkChargeLimit(5_000_000, 1_000_000)).not.toThrow();
      expect(() =>
        pointPolicy.checkChargeLimit(0, PointPolicy.MAX_POINT_LIMIT),
      ).not.toThrow();
      expect(() =>
        pointPolicy.checkChargeLimit(PointPolicy.MAX_POINT_LIMIT - 1, 1),
      ).not.toThrow();
    });

    it('충전 후 포인트가 한도를 초과할 때 예외를 발생시켜야 한다', () => {
      expect(() =>
        pointPolicy.checkChargeLimit(
          5_000_000,
          PointPolicy.MAX_POINT_LIMIT - 5_000_000 + 1,
        ),
      ).toThrow(BadRequestException);
      expect(() => pointPolicy.checkChargeLimit(PointPolicy.MAX_POINT_LIMIT, 1)).toThrow(
        BadRequestException,
      );
    });

    it('예외 메시지가 올바른지 확인해야 한다', () => {
      expect(() =>
        pointPolicy.checkChargeLimit(
          5_000_000,
          PointPolicy.MAX_POINT_LIMIT - 5_000_000 + 1,
        ),
      ).toThrow('포인트 한도 초과');
    });
  });

  describe('checkUseAmount', () => {
    it('사용 금액이 유효할 때 성공해야 한다', () => {
      expect(() => pointPolicy.checkUseAmount(PointPolicy.MIN_USE_AMOUNT)).not.toThrow();
      expect(() =>
        pointPolicy.checkUseAmount(PointPolicy.USE_AMOUNT_UNIT * 2),
      ).not.toThrow();
      expect(() =>
        pointPolicy.checkUseAmount(PointPolicy.USE_AMOUNT_UNIT * 10),
      ).not.toThrow();
      expect(() => pointPolicy.checkUseAmount(PointPolicy.MAX_POINT_LIMIT)).not.toThrow();
    });

    it('사용 금액이 최소 금액 미만일 때 예외를 발생시켜야 한다', () => {
      expect(() => pointPolicy.checkUseAmount(PointPolicy.MIN_USE_AMOUNT - 1)).toThrow(
        BadRequestException,
      );
      expect(() => pointPolicy.checkUseAmount(0)).toThrow(BadRequestException);
      expect(() => pointPolicy.checkUseAmount(-1)).toThrow(BadRequestException);
    });

    it('사용 금액이 최대 한도를 초과할 때 예외를 발생시켜야 한다', () => {
      expect(() => pointPolicy.checkUseAmount(PointPolicy.MAX_POINT_LIMIT + 1)).toThrow(
        BadRequestException,
      );
      expect(() => pointPolicy.checkUseAmount(PointPolicy.MAX_POINT_LIMIT * 2)).toThrow(
        BadRequestException,
      );
    });

    it('사용 금액이 100 단위가 아닐 때 예외를 발생시켜야 한다', () => {
      expect(() => pointPolicy.checkUseAmount(PointPolicy.MIN_USE_AMOUNT + 1)).toThrow(
        BadRequestException,
      );
      expect(() => pointPolicy.checkUseAmount(PointPolicy.USE_AMOUNT_UNIT + 50)).toThrow(
        BadRequestException,
      );
      expect(() =>
        pointPolicy.checkUseAmount(PointPolicy.USE_AMOUNT_UNIT * 10 - 1),
      ).toThrow(BadRequestException);
    });

    it('예외 메시지가 올바른지 확인해야 한다', () => {
      expect(() => pointPolicy.checkUseAmount(PointPolicy.MIN_USE_AMOUNT - 1)).toThrow(
        '포인트 사용 단위 오류',
      );
      expect(() => pointPolicy.checkUseAmount(PointPolicy.MIN_USE_AMOUNT + 1)).toThrow(
        '포인트 사용 단위 오류',
      );
      expect(() => pointPolicy.checkUseAmount(PointPolicy.MAX_POINT_LIMIT + 1)).toThrow(
        '포인트 사용 단위 오류',
      );
    });
  });

  describe('checkDailyUseLimit', () => {
    it('일일 사용 한도 내일 때 성공해야 한다', () => {
      expect(() =>
        pointPolicy.checkDailyUseLimit(0, PointPolicy.DAILY_USE_LIMIT),
      ).not.toThrow();
      expect(() =>
        pointPolicy.checkDailyUseLimit(30_000, PointPolicy.DAILY_USE_LIMIT - 30_000),
      ).not.toThrow();
      expect(() =>
        pointPolicy.checkDailyUseLimit(PointPolicy.DAILY_USE_LIMIT - 1, 1),
      ).not.toThrow();
    });

    it('일일 사용 한도를 초과할 때 예외를 발생시켜야 한다', () => {
      expect(() =>
        pointPolicy.checkDailyUseLimit(0, PointPolicy.DAILY_USE_LIMIT + 1),
      ).toThrow(BadRequestException);
      expect(() =>
        pointPolicy.checkDailyUseLimit(30_000, PointPolicy.DAILY_USE_LIMIT - 30_000 + 1),
      ).toThrow(BadRequestException);
      expect(() =>
        pointPolicy.checkDailyUseLimit(PointPolicy.DAILY_USE_LIMIT, 1),
      ).toThrow(BadRequestException);
    });

    it('예외 메시지가 올바른지 확인해야 한다', () => {
      expect(() =>
        pointPolicy.checkDailyUseLimit(0, PointPolicy.DAILY_USE_LIMIT + 1),
      ).toThrow('일일 사용 한도 초과');
    });
  });

  describe('checkSufficientBalance', () => {
    it('잔액이 충분할 때 성공해야 한다', () => {
      expect(() => pointPolicy.checkSufficientBalance(1000, 1000)).not.toThrow();
      expect(() => pointPolicy.checkSufficientBalance(2000, 1000)).not.toThrow();
      expect(() =>
        pointPolicy.checkSufficientBalance(
          PointPolicy.MAX_POINT_LIMIT,
          PointPolicy.MAX_POINT_LIMIT / 2,
        ),
      ).not.toThrow();
    });

    it('잔액이 부족할 때 예외를 발생시켜야 한다', () => {
      expect(() => pointPolicy.checkSufficientBalance(999, 1000)).toThrow(
        BadRequestException,
      );
      expect(() => pointPolicy.checkSufficientBalance(0, 1)).toThrow(BadRequestException);
      expect(() =>
        pointPolicy.checkSufficientBalance(
          PointPolicy.MAX_POINT_LIMIT / 2,
          PointPolicy.MAX_POINT_LIMIT,
        ),
      ).toThrow(BadRequestException);
    });

    it('예외 메시지가 올바른지 확인해야 한다', () => {
      expect(() => pointPolicy.checkSufficientBalance(999, 1000)).toThrow('잔액 부족');
    });
  });

  describe('상수 값 검증', () => {
    it('정의된 상수들이 올바른 값을 가져야 한다', () => {
      // 이 테스트는 상수 값이 변경되었을 때 알 수 있도록 하는 안전장치입니다
      expect(() => pointPolicy.checkPointRange(10_000_000)).not.toThrow();
      expect(() => pointPolicy.checkPointRange(10_000_000 + 1)).toThrow();

      expect(() => pointPolicy.checkDailyUseLimit(0, 50_000)).not.toThrow();
      expect(() => pointPolicy.checkDailyUseLimit(0, 50_000 + 1)).toThrow();

      expect(() => pointPolicy.checkUseAmount(100)).not.toThrow();
      expect(() => pointPolicy.checkUseAmount(100 - 1)).toThrow();

      expect(() => pointPolicy.checkUseAmount(200)).not.toThrow();
      expect(() => pointPolicy.checkUseAmount(200 + 50)).toThrow();
    });
  });
});
