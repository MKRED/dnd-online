import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { UserSettings } from 'shared';
import { AuthGuard, type AuthenticatedRequest } from '../auth.guard.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { ProfileService } from './profile.service.js';

// Настройки пользователя. Отдельно от ProfileController: там строгий лимит против
// перебора пароля, а настройки переключают часто.
@UseGuards(AuthGuard)
@Controller('profile/settings')
export class ProfileSettingsController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  get(@Req() req: AuthenticatedRequest): Promise<UserSettings> {
    return this.profileService.getSettings(req.user.sub);
  }

  @Patch()
  update(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateSettingsDto,
  ): Promise<UserSettings> {
    return this.profileService.updateSettings(req.user.sub, dto);
  }
}
