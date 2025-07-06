import { Module } from '@nestjs/common';
import { PointController } from './controller/point.controller';
import { PointService } from './point.service';
import { DatabaseModule } from 'src/database/database.module';
import { PointPolicy } from './policy/point.policy';
import { PointRepository } from './repository/point.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [PointController],
  providers: [PointService, PointPolicy, PointRepository],
})
export class PointModule {}
