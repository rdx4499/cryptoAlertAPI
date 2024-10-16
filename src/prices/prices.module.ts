import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricesService } from './prices.service';
import { PricesController } from './prices.controller';
import { Price } from './price.entity';
import { Alert } from '../alerts/alert.entity';

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([Price, Alert])],
  controllers: [PricesController],
  providers: [PricesService],
})
export class PricesModule {}
