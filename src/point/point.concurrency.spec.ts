import { Test, TestingModule } from '@nestjs/testing';
import { PointService } from './service/point.service';
import { PointRepository } from './point.repository';
import { PointPolicy } from './service/policy/point.policy';
import { DatabaseModule } from 'src/database/database.module';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { TransactionType } from './point.model';

describe('PointService Concurrency Tests (Integration)', () => {
  let service: PointService;
  let userPointTable: UserPointTable;
  let pointHistoryTable: PointHistoryTable;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [PointService, PointRepository, PointPolicy],
    }).compile();

    service = module.get<PointService>(PointService);
    userPointTable = module.get<UserPointTable>(UserPointTable);
    pointHistoryTable = module.get<PointHistoryTable>(PointHistoryTable);
  });

  afterEach(() => {
    // UserPointTable의 Map 초기화
    (userPointTable as any).table.clear();

    // PointHistoryTable의 Array와 cursor 초기화
    (pointHistoryTable as any).table.length = 0;
    (pointHistoryTable as any).cursor = 1;
  });

  // 타입 가드 함수
  const isErrorResult = (result: any): result is { error: any } => {
    return result && typeof result === 'object' && 'error' in result;
  };

  describe('동시 포인트 충전 테스트', () => {
    it('동시에 여러 번 포인트를 충전해도 정확한 금액이 반영되어야 한다', async () => {
      const userId = 1;
      const chargeAmount = 1000;
      const concurrentRequests = 20;

      // 동시에 여러 번 포인트 충전
      const promises = Array.from({ length: concurrentRequests }, () =>
        service.chargePoint(userId, chargeAmount),
      );

      await Promise.all(promises);

      // 최종 포인트 확인
      const finalPoint = await service.getPoint(userId);
      expect(finalPoint.point).toBe(chargeAmount * concurrentRequests);

      // 모든 충전 히스토리 확인
      const histories = await service.getHistory(userId);
      expect(histories.length).toBe(concurrentRequests);
    });

    it('동시 충전 시 최대 포인트 제한을 초과하면 적절히 처리되어야 한다', async () => {
      const userId = 1;
      const chargeAmount = 3_000_000; // 최대 10_000_000
      const concurrentRequests = 20;

      // 동시에 여러 번 포인트 충전 (일부는 실패해야 함)
      const promises = Array.from({ length: concurrentRequests }, () =>
        service.chargePoint(userId, chargeAmount).catch(error => ({ error })),
      );

      const results = await Promise.all(promises);

      // 최종 포인트 확인 (최대 10_000_000을 초과하지 않아야 함)
      const finalPoint = await service.getPoint(userId);
      expect(finalPoint.point).toBeLessThanOrEqual(10_000_000);

      // 성공한 요청과 실패한 요청 확인
      const successfulRequests = results.filter(r => !isErrorResult(r));
      const failedRequests = results.filter(r => isErrorResult(r));

      expect(successfulRequests.length).toBe(3);
      expect(failedRequests.length).toBe(17);
    });
  });

  describe('동시 포인트 사용 테스트', () => {
    it('동시에 여러 번 포인트를 사용해도 정확한 금액이 차감되어야 한다', async () => {
      const userId = 1;
      const initialAmount = 10_000_000;
      const useAmount = 500;
      const concurrentRequests = 20;

      // 먼저 포인트 충전
      await service.chargePoint(userId, initialAmount);

      // 동시에 여러 번 포인트 사용
      const promises = Array.from({ length: concurrentRequests }, () =>
        service.usePoint(userId, useAmount),
      );

      await Promise.all(promises);

      // 최종 포인트 확인
      const finalPoint = await service.getPoint(userId);
      expect(finalPoint.point).toBe(initialAmount - useAmount * concurrentRequests);

      // 모든 사용 히스토리 확인
      const histories = await service.getHistory(userId);
      expect(histories.length).toBe(concurrentRequests + 1); // 첫 충전 1회
    });

    it('동시 사용 시 잔액이 부족하면 적절히 처리되어야 한다', async () => {
      const userId = 1;
      const initialAmount = 10_000;
      const useAmount = 800;
      const concurrentRequests = 20;

      // 먼저 포인트 충전
      await service.chargePoint(userId, initialAmount);

      // 동시에 여러 번 포인트 사용 (일부는 실패해야 함)
      const promises = Array.from({ length: concurrentRequests }, () =>
        service.usePoint(userId, useAmount).catch(error => ({ error })),
      );

      const results = await Promise.all(promises);

      // 최종 포인트 확인
      const finalPoint = await service.getPoint(userId);
      expect(finalPoint.point).toEqual(initialAmount - useAmount * concurrentRequests);
      expect(finalPoint.point).toBeGreaterThanOrEqual(0);

      // 성공한 요청과 실패한 요청 확인
      const successfulRequests = results.filter(r => !isErrorResult(r));
      const failedRequests = results.filter(r => isErrorResult(r));

      expect(successfulRequests.length).toBe(12);
      expect(failedRequests.length).toBe(8);
    });
  });

  describe('동시 포인트 충전/사용 혼합 테스트', () => {
    it('동시에 충전과 사용이 발생해도 데이터 일관성이 유지되어야 한다', async () => {
      const userId = 1;
      const chargeAmount = 10_000;
      const useAmount = 500;
      const chargeCount = 20;
      const useCount = 20;

      // 첫 충전
      const firstCharge = await service.chargePoint(userId, chargeAmount);

      // 동시에 충전과 사용 실행
      const chargePromises = Array.from({ length: chargeCount }, () =>
        service.chargePoint(userId, chargeAmount),
      );
      const usePromises = Array.from({ length: useCount }, () =>
        service.usePoint(userId, useAmount),
      );

      await Promise.allSettled([...chargePromises, ...usePromises]);

      // 최종 포인트 확인
      const finalPoint = await service.getPoint(userId);

      const expectedPoint =
        firstCharge.point + chargeCount * chargeAmount - useCount * useAmount;
      expect(finalPoint.point).toBe(expectedPoint);

      // 히스토리 확인
      const histories = await service.getHistory(userId);
      expect(histories.length).toBe(chargeCount + useCount + 1); // 첫 충전 1회
    });

    it('동시성 환경에서도 일일 사용 제한이 정확히 적용되어야 한다', async () => {
      const userId = 1;
      const initialAmount = 100_000;
      const useAmount = 2_000; // 일일 한도: 50_000
      const concurrentRequests = 40;

      // 먼저 포인트 충전
      await service.chargePoint(userId, initialAmount);

      // 동시에 여러 번 포인트 사용 (일일 한도 초과)
      const promises = Array.from({ length: concurrentRequests }, () =>
        service.usePoint(userId, useAmount).catch(error => ({ error })),
      );

      const results = await Promise.all(promises);

      // 성공한 요청과 실패한 요청 확인
      const successfulRequests = results.filter(r => !isErrorResult(r));
      const failedRequests = results.filter(r => isErrorResult(r));

      // 일일 한도(50_000)를 초과하지 않도록 일부 요청은 실패해야 함
      expect(successfulRequests.length).toBe(25);
      expect(failedRequests.length).toBe(15);

      // 실제 사용된 금액이 일일 한도를 초과하지 않는지 확인
      const histories = await service.getHistory(userId);
      const dailyUsed = histories
        .filter(h => h.type === TransactionType.USE)
        .reduce((sum, h) => sum + h.amount, 0);

      expect(dailyUsed).toBeLessThanOrEqual(50_000);
    });
  });
});
