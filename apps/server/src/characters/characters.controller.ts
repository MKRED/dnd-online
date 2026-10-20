import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { SessionOrApiTokenGuard } from '../api-tokens/session-or-api-token.guard.js';
import { CharacterAccessService } from './character-access.service.js';
import { CharactersService } from './characters.service.js';
import { CreateCharacterDto } from './dto/create-character.dto.js';
import { UpdateCharacterAccessDto } from './dto/update-character-access.dto.js';
import { UpdateCharacterDto } from './dto/update-character.dto.js';
import { AllowApiToken } from '../api-tokens/allow-api-token.decorator.js';

@Controller('characters')
@UseGuards(SessionOrApiTokenGuard)
export class CharactersController {
  constructor(
    private readonly charactersService: CharactersService,
    private readonly accessService: CharacterAccessService,
  ) {}

  @AllowApiToken()
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateCharacterDto) {
    return this.charactersService.create(req.user.sub, dto);
  }

  @AllowApiToken()
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.charactersService.findAllForUser(req.user.sub);
  }

  // Свой персонаж или чужой, открытый по ссылке.
  @AllowApiToken()
  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.charactersService.findOneVisible(req.user.sub, id);
  }

  @AllowApiToken()
  @Put(':id')
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCharacterDto,
  ) {
    return this.charactersService.replace(req.user.sub, id, dto);
  }

  @Put(':id/access')
  setAccess(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCharacterAccessDto,
  ) {
    return this.accessService.setLinkAccess(req.user.sub, id, dto.linkAccess);
  }

  @AllowApiToken()
  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCharacterDto,
  ) {
    return this.charactersService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.charactersService.remove(req.user.sub, id);
  }
}
