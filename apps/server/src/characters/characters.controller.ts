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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CharactersService } from './characters.service.js';
import { CreateCharacterDto } from './dto/create-character.dto.js';
import { UpdateCharacterDto } from './dto/update-character.dto.js';

@Controller('characters')
@UseGuards(AuthGuard)
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateCharacterDto) {
    return this.charactersService.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.charactersService.findAllForUser(req.user.sub);
  }

  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.charactersService.findOneForUser(req.user.sub, id);
  }

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
