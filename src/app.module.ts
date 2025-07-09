import { Module } from '@nestjs/common';
import { PointModule } from './point/point.module';

@Module({
  imports: [PointModule],
})
export class AppModule {}
