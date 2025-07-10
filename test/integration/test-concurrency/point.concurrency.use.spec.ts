import { Test, TestingModule } from '@nestjs/testing';
import { PointService } from '../../../src/point/service/point.service';
import { PointRepository } from '../../../src/point/point.repository';
import { PointPolicy } from '../../../src/point/service/policy/point.policy';
import { DatabaseModule } from 'src/database/database.module';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { TransactionType } from '../../../src/point/point.model';

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

  const concurrentRequests = 10;

  describe('동시 포인트 사용 테스트', () => {
    it('동시에 여러 번 포인트를 사용해도 정확한 금액이 차감되어야 한다', async () => {
      const userId = 1;
      const initialAmount = 10_000_000;
      const useAmount = 500;

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
    }, 15000);

    it('동시 사용 시 잔액이 부족하면 적절히 처리되어야 한다', async () => {
      const userId = 1;
      const initialAmount = 5_000;
      const useAmount = 800;

      // 먼저 포인트 충전
      await service.chargePoint(userId, initialAmount);

      // 동시에 여러 번 포인트 사용 (일부는 실패해야 함)
      const promises = Array.from({ length: concurrentRequests }, () =>
        service.usePoint(userId, useAmount).catch(error => ({ error })),
      );

      const results = await Promise.all(promises);

      // 최종 포인트 확인
      const finalPoint = await service.getPoint(userId);
      expect(finalPoint.point).toBeGreaterThanOrEqual(0);

      // 성공한 요청과 실패한 요청 확인
      const successfulRequests = results.filter(r => !isErrorResult(r));
      const failedRequests = results.filter(r => isErrorResult(r));

      expect(successfulRequests.length).toBe(6);
      expect(failedRequests.length).toBe(4);
    }, 15000);
  });
});
