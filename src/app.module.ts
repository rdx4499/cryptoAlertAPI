import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PricesModule } from './prices/prices.module';
import { AlertsModule } from './alerts/alerts.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Price } from './prices/price.entity';
import { Alert } from './alerts/alert.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PricesModule,
    AlertsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [Price, Alert],
      synchronize: true,
    }),
  ],
})
export class AppModule {}
