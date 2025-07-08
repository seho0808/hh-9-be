import { Module } from '@nestjs/common';
import { PointController } from './point.controller';
import { PointService } from './service/point.service';
import { DatabaseModule } from 'src/database/database.module';
import { PointPolicy } from './service/policy/point.policy';
import { PointRepository } from './point.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [PointController],
  providers: [PointService, PointPolicy, PointRepository],
})
export class PointModule {}
