import { PartialType } from '@nestjs/mapped-types';

import { CreateUserDto } from '@/modules/user/presentation/DTOs/create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
