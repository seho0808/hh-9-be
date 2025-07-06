import { Test, TestingModule } from '@nestjs/testing';
import { PointController } from './point.controller';
import { PointService } from '../service/point.service';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { TransactionType } from '../point.model';

describe('PointController', () => {
  let controller: PointController;
  let pointService: PointService;

  beforeEach(async () => {
    jest.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointController],
      providers: [
        {
          provide: PointService,
          useValue: {
            getPoint: jest.fn(),
            getHistory: jest.fn(),
            chargePoint: jest.fn(),
            usePoint: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PointController>(PointController);
    pointService = module.get<PointService>(PointService);
  });

  describe('GET /point/:id', () => {
    it('서비스의 getPoint 메서드를 호출하고 결과를 반환함', async () => {
      const mockResult = {
        id: 1,
        point: 100,
        updateMillis: 123456789,
      };
      jest.spyOn(pointService, 'getPoint').mockResolvedValue(mockResult);

      const result = await controller.point(1);

      expect(pointService.getPoint).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResult);
    });

    it('서비스에서 예외가 발생하면 그대로 전파됨', async () => {
      jest
        .spyOn(pointService, 'getPoint')
        .mockRejectedValue(new InternalServerErrorException());

      await expect(controller.point(1)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('GET /point/:id/histories', () => {
    it('서비스의 getHistory 메서드를 호출하고 결과를 반환함', async () => {
      const mockResult = [
        {
          id: 1,
          userId: 1,
          amount: 100,
          type: TransactionType.CHARGE,
          timeMillis: 123456789,
        },
      ];
      jest.spyOn(pointService, 'getHistory').mockResolvedValue(mockResult);

      const result = await controller.history(1);

      expect(pointService.getHistory).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResult);
    });

    it('서비스에서 예외가 발생하면 그대로 전파됨', async () => {
      jest
        .spyOn(pointService, 'getHistory')
        .mockRejectedValue(new InternalServerErrorException());

      await expect(controller.history(1)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('PATCH /point/:id/charge', () => {
    it('서비스의 chargePoint 메서드를 호출하고 결과를 반환함', async () => {
      const mockResult = {
        id: 1,
        point: 200,
        updateMillis: 123456789,
      };
      jest.spyOn(pointService, 'chargePoint').mockResolvedValue(mockResult);

      const result = await controller.charge(1, { amount: 100 });

      expect(pointService.chargePoint).toHaveBeenCalledWith(1, 100);
      expect(result).toEqual(mockResult);
    });

    it('서비스에서 예외가 발생하면 그대로 전파됨', async () => {
      jest
        .spyOn(pointService, 'chargePoint')
        .mockRejectedValue(new BadRequestException());

      await expect(controller.charge(1, { amount: 100 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('PATCH /point/:id/use', () => {
    it('서비스의 usePoint 메서드를 호출하고 결과를 반환함', async () => {
      const mockResult = {
        id: 1,
        point: 900,
        updateMillis: 123456789,
      };
      jest.spyOn(pointService, 'usePoint').mockResolvedValue(mockResult);

      const result = await controller.use(1, { amount: 100 });

      expect(pointService.usePoint).toHaveBeenCalledWith(1, 100);
      expect(result).toEqual(mockResult);
    });

    it('서비스에서 예외가 발생하면 그대로 전파됨', async () => {
      jest.spyOn(pointService, 'usePoint').mockRejectedValue(new BadRequestException());

      await expect(controller.use(1, { amount: 100 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
