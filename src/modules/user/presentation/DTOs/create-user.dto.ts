import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string | null;

  @IsString()
  @IsOptional()
  lastName?: string | null;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  avatar: string;

  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  providerId: string;
}
