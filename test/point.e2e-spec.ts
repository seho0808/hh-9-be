import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('포인트 API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /point/:id', () => {
    it('사용자 포인트를 반환해야 한다', async () => {
      const response = await request(app.getHttpServer()).get('/point/1').expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('point', 0);
      expect(response.body).toHaveProperty('updateMillis');
    });

    it('유효하지 않은 ID에 대해 400을 반환해야 한다', async () => {
      await request(app.getHttpServer()).get('/point/invalid').expect(400);
    });
  });

  describe('PATCH /point/:id/charge', () => {
    it('포인트 충전이 성공해야 한다', async () => {
      const response = await request(app.getHttpServer())
        .patch('/point/1/charge')
        .send({ amount: 1000 })
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('point', 1000);
      expect(response.body).toHaveProperty('updateMillis');
    });

    it('유효하지 않은 금액에 대해 400을 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .patch('/point/1/charge')
        .send({ amount: 0 })
        .expect(400);
    });

    it('최대 포인트 초과 시 400을 반환해야 한다', async () => {
      // 먼저 최대 포인트까지 충전
      await request(app.getHttpServer())
        .patch('/point/2/charge')
        .send({ amount: 10_000_000 })
        .expect(200);

      // 추가 충전 시도
      await request(app.getHttpServer())
        .patch('/point/2/charge')
        .send({ amount: 1 })
        .expect(400);
    });
  });

  describe('PATCH /point/:id/use', () => {
    it('포인트 사용이 성공해야 한다', async () => {
      // 먼저 포인트 충전
      await request(app.getHttpServer())
        .patch('/point/3/charge')
        .send({ amount: 1000 })
        .expect(200);

      // 포인트 사용
      const response = await request(app.getHttpServer())
        .patch('/point/3/use')
        .send({ amount: 500 })
        .expect(200);

      expect(response.body).toHaveProperty('id', 3);
      expect(response.body).toHaveProperty('point', 500);
    });

    it('유효하지 않은 금액에 대해 400을 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .patch('/point/3/use')
        .send({ amount: 50 }) // 100P 미만
        .expect(400);
    });

    it('잔액 부족 시 400을 반환해야 한다', async () => {
      await request(app.getHttpServer())
        .patch('/point/4/use')
        .send({ amount: 1000 }) // 포인트 없는 상태에서 사용
        .expect(400);
    });
  });

  describe('GET /point/:id/histories', () => {
    it('포인트 이력을 반환해야 한다', async () => {
      // 포인트 충전 후 사용
      await request(app.getHttpServer())
        .patch('/point/5/charge')
        .send({ amount: 1000 })
        .expect(200);

      await request(app.getHttpServer())
        .patch('/point/5/use')
        .send({ amount: 300 })
        .expect(200);

      // 히스토리 조회
      const response = await request(app.getHttpServer())
        .get('/point/5/histories')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);

      // 최신순 정렬 확인
      expect(response.body[0].timeMillis).toBeGreaterThanOrEqual(
        response.body[1].timeMillis,
      );
    });
  });

  describe('포인트 전체 생명주기 테스트', () => {
    it('포인트 전체 생명주기를 처리해야 한다', async () => {
      const userId = 6;

      // 1. 초기 포인트 조회
      let response = await request(app.getHttpServer())
        .get(`/point/${userId}`)
        .expect(200);
      expect(response.body.point).toBe(0);

      // 2. 포인트 충전
      response = await request(app.getHttpServer())
        .patch(`/point/${userId}/charge`)
        .send({ amount: 2000 })
        .expect(200);
      expect(response.body.point).toBe(2000);

      // 3. 포인트 사용
      response = await request(app.getHttpServer())
        .patch(`/point/${userId}/use`)
        .send({ amount: 700 })
        .expect(200);
      expect(response.body.point).toBe(1300);

      // 4. 히스토리 확인
      response = await request(app.getHttpServer())
        .get(`/point/${userId}/histories`)
        .expect(200);
      expect(response.body.length).toBe(2);

      // 5. 최종 포인트 확인
      response = await request(app.getHttpServer()).get(`/point/${userId}`).expect(200);
      expect(response.body.point).toBe(1300);
    });
  });
});
