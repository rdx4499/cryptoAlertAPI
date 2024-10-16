import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { PricesService } from './prices.service';
import { Response } from 'express';
import { Price } from './price.entity';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('prices')
@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Get('/hourly')
  async getHourlyPrices(@Query('chain') chain: string, @Res() res: Response) {
    if (chain === 'ethereum'.toString() || chain === 'polygon'.toString()) {
      const prices: Price[] = await this.pricesService.getHourlyPrices(chain);

      if (prices && prices.length > 0) {
        return res.status(HttpStatus.OK).json({
          statusCode: HttpStatus.OK,
          data: prices,
        });
      } else {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'No prices found',
        });
      }
    } else {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid chain, must be either ethereum or polygon',
      });
    }
  }

  @Get('/swap-rate')
  async getSwapRate(
    @Query('ethAmount') ethAmount: number,
    @Res() res: Response,
  ) {
    if (ethAmount <= 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid swap amount, must be positive number',
      });
    }

    const swaprate = await this.pricesService.getSwapRate(ethAmount);

    if (swaprate) {
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        data: swaprate,
      });
    } else {
      return res.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'No swap rate found',
      });
    }
  }
}
