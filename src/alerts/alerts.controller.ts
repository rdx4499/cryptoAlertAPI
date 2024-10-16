import {
  Controller,
  Post,
  Body,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { SetAlertDto } from './dto/set-alert.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @HttpCode(201)
  @ApiBody({ type: SetAlertDto })
  async setAlert(@Body() setAlertDto: SetAlertDto) {
    try {
      const { chain, dollar, email } = setAlertDto;
      await this.alertsService.setAlert(chain, dollar, email);
      return;
    } catch (error) {
      throw new BadRequestException('Invalid data provided');
    }
  }
}
