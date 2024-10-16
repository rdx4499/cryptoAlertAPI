import { IsEmail, IsString, IsNumber, Min, IsIn } from 'class-validator';

export class SetAlertDto {
  @IsString()
  @IsIn(['polygon', 'ethereum'], {
    message: 'chain must be either polygon or ethereum',
  })
  chain: string; // Ensures chain is either 'polygon' or 'ethereum'

  @IsNumber()
  @Min(0)
  dollar: number; // Ensures price is a positive number

  @IsEmail()
  email: string; // Ensures email is a valid email format
}
