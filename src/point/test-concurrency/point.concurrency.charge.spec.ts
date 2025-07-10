import { Test, TestingModule } from '@nestjs/testing';
import { PointService } from '../service/point.service';
import { PointRepository } from '../point.repository';
import { PointPolicy } from '../service/policy/point.policy';
import { DatabaseModule } from 'src/database/database.module';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { TransactionType } from '../point.model';

describe('PointService Concurrency Tests (Integration) - Charge', () => {
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

  describe('동시 포인트 충전 테스트', () => {
    it('동시에 여러 번 포인트를 충전해도 정확한 금액이 반영되어야 한다', async () => {
      const userId = 1;
      const chargeAmount = 1000;

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
    }, 15000);

    it('동시 충전 시 최대 포인트 제한을 초과하면 적절히 처리되어야 한다', async () => {
      const userId = 1;
      const chargeAmount = 3_000_000; // 최대 10_000_000

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
      expect(failedRequests.length).toBe(7);
    }, 15000);
  });
});
