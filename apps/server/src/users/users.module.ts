import { Module } from '@nestjs/common';
import { UserIdentitiesService } from './user-identities.service.js';
import { UsersService } from './users.service.js';

@Module({
  providers: [UsersService, UserIdentitiesService],
  exports: [UsersService, UserIdentitiesService],
})
export class UsersModule {}
