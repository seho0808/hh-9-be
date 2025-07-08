import { Body, Controller, Get, Param, Patch, ValidationPipe } from '@nestjs/common';
import { PointHistory, UserPoint } from './point.model';
import { PointBody as PointDto } from './point.dto';
import { ParsePositiveIntPipe } from 'src/common/pipes/parse-positive-int.pipe';
import { PointService } from './service/point.service';

@Controller('/point')
export class PointController {
  constructor(private readonly pointService: PointService) {}

  @Get(':id')
  async point(@Param('id', ParsePositiveIntPipe) id: number): Promise<UserPoint> {
    return this.pointService.getPoint(id);
  }

  @Get(':id/histories')
  async history(@Param('id', ParsePositiveIntPipe) id: number): Promise<PointHistory[]> {
    return this.pointService.getHistory(id);
  }

  @Patch(':id/charge')
  async charge(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body(ValidationPipe) pointDto: PointDto,
  ): Promise<UserPoint> {
    return this.pointService.chargePoint(id, pointDto.amount);
  }

  @Patch(':id/use')
  async use(
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body(ValidationPipe) pointDto: PointDto,
  ): Promise<UserPoint> {
    return this.pointService.usePoint(id, pointDto.amount);
  }
}
