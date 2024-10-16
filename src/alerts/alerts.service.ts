import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './alert.entity';

@Injectable()
export class AlertsService {
  constructor(@InjectRepository(Alert) private alertRepo: Repository<Alert>) {}

  async setAlert(chain: string, price: number, email: string) {
    await this.alertRepo.save({ chain, price, email });
  }
}
