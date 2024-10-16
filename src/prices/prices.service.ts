import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Price } from './price.entity';
import * as nodemailer from 'nodemailer';
import Moralis from 'moralis';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { Alert } from 'src/alerts/alert.entity';

@Injectable()
export class PricesService {
  constructor(
    @InjectRepository(Price) private priceRepo: Repository<Price>,
    @InjectRepository(Alert) private alertRepo: Repository<Alert>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await Moralis.start({
      apiKey: this.configService.get<string>('MORALIS_API_KEY'),
    });
  }

  async getHourlyPrices(chain: string) {
    const latestPrice = await this.priceRepo.findOne({
      where: { chain },
      order: { createdAt: 'DESC' },
    });

    if (!latestPrice) {
      return []; // Return an empty array if there are no prices available
    }

    const latestTimestamp = new Date(latestPrice.createdAt); // Get the timestamp of the last price entry
    const hourlyPrices = []; // Array to hold hourly prices

    // Calculate prices for the last 24 hours based on the latest timestamp
    for (let i = 0; i < 24; i++) {
      const hourTimestamp = new Date(
        latestTimestamp.getTime() - i * 60 * 60 * 1000,
      );
      const hourStart = new Date(hourTimestamp.getTime()); // Start of the hour
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000); // End of the hour

      // Find the most recent price for the current hour
      const priceEntry = await this.priceRepo
        .createQueryBuilder('price')
        .where('price.chain = :chain', { chain })
        .andWhere('price.createdAt >= :hourStart', { hourStart })
        .andWhere('price.createdAt < :hourEnd', { hourEnd })
        .orderBy('price.createdAt', 'DESC')
        .getOne();

      // Push the price or null if no entry found
      hourlyPrices.push({
        hour: hourStart.toISOString().slice(0, 13), // Format as 'YYYY-MM-DDTHH'
        price: priceEntry ? priceEntry.price : null, // Assuming 'value' is the price field
      });
    }

    return hourlyPrices;
  }

  async getSwapRate(ethAmount: number) {
    const swapRate = await Moralis.EvmApi.token.getTokenPrice({
      chain: '0x1',
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    });

    let fee;
    let btcAmount;
    if (swapRate.result.nativePrice.value) {
      fee = ethAmount * 0.03;

      btcAmount =
        (ethAmount - fee) *
        (1 /
          Number(
            ethers.formatUnits(
              swapRate?.result?.nativePrice?.value.toString(),
              36,
            ),
          ));
    } else {
      return null;
    }

    const ethPrice = await Moralis.EvmApi.token.getTokenPrice({
      chain: '0x1',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    });

    if (!ethPrice.result) {
      return null;
    }

    return {
      btcAmount,
      fee: { eth: fee, dollar: fee * ethPrice?.result?.usdPrice },
    };
  }

  async fetchPrices() {
    const ethPrice = await Moralis.EvmApi.token.getTokenPrice({
      chain: '0x1',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    });
    const polygonPrice = await Moralis.EvmApi.token.getTokenPrice({
      chain: '0x89',
      address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    });

    await this.priceRepo.save([
      { chain: 'ethereum', price: ethPrice?.result?.usdPrice },
      { chain: 'polygon', price: polygonPrice?.result?.usdPrice },
    ]);
  }

  async sendPriceAlert() {
    const currentPriceEth = await this.priceRepo.findOne({
      where: { chain: 'ethereum' },
      order: { createdAt: 'DESC' },
    });
    const oneHourAgoPriceEth = await this.priceRepo.findOne({
      where: {
        chain: 'ethereum',
        createdAt: MoreThan(new Date(Date.now() - 3600 * 1000)),
      },
    });

    if (
      (currentPriceEth?.price - oneHourAgoPriceEth?.price) /
        oneHourAgoPriceEth?.price >
      0.03
    ) {
      await this.sendEmail(
        'hyperhire_assignment@hyperhire.in',
        'Price Alert Ethereum',
        'Price increased by more than 3% for Ethereum',
      );
    }

    const alertseth = await this.alertRepo.find({
      where: {
        chain: 'ethereum',
        price: LessThanOrEqual(currentPriceEth?.price),
      },
    });

    alertseth.forEach(async (alert) => {
      await this.sendEmail(
        alert.email,
        'Price Alert Ethreum',
        `Price above your alert level ${alert.price}`,
      );
      await this.alertRepo.remove(alert);
    });

    const currentPricePoly = await this.priceRepo.findOne({
      where: { chain: 'polygon' },
      order: { createdAt: 'DESC' },
    });
    const oneHourAgoPricePoly = await this.priceRepo.findOne({
      where: {
        chain: 'polygon',
        createdAt: MoreThan(new Date(Date.now() - 3600 * 1000)),
      },
    });

    if (
      (currentPricePoly?.price - oneHourAgoPricePoly?.price) /
        oneHourAgoPricePoly?.price >
      0.03
    ) {
      await this.sendEmail(
        'hyperhire_assignment@hyperhire.in',
        'Price Alert Polygon',
        'Price increased by more than 3% Polygon',
      );
    }

    const alertspoly = await this.alertRepo.find({
      where: {
        chain: 'polygon',
        price: LessThanOrEqual(currentPricePoly?.price),
      },
    });

    alertspoly.forEach(async (alert) => {
      await this.sendEmail(
        alert.email,
        'Price Alert Polygon',
        `Price above your alert level ${alert.price}`,
      );
      await this.alertRepo.remove(alert);
    });
  }

  private async sendEmail(to: string, subject: string, text: string) {
    const emailuser = this.configService.get<string>('EMAIL_USER');
    const emailpass = this.configService.get<string>('EMAIL_PASS');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: emailuser, pass: emailpass },
    });

    await transporter.sendMail({
      from: emailuser,
      to,
      subject,
      text,
    });
  }

  @Cron('*/5 * * * *') // every 5 minutes
  async handleCron() {
    await this.fetchPrices();
    await this.sendPriceAlert();
  }
}
