import { Controller, Get, Post, Body, UseGuards, Request, Param, ParseUUIDPipe, Put, Delete, Patch } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { PetsService } from './pets.service.js';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePetDto } from './dto/pet-update.dto.js';

@Controller('pets')
@UseGuards(AuthGuard('jwt')) // 1. BU KAPIYA SADECE BİLETİ OLANLAR GİREBİLİR!
export class PetsController {
  constructor(private readonly petsService: PetsService) { }

  @Post()
  create(@Body() createPetDto: CreatePetDto, @Request() req: ExpressRequest) {
    // 2. Guard, biletin içindeki bilgiyi 'req.user' içine koydu.
    // Bizim stratejimizde return { userId: payload.sub } demiştik hatırlarsan.
    const userId = req.user!.userId;

    // 3. Servise hem veriyi hem de kullanıcının gerçek ID'sini gönderiyoruz
    return this.petsService.create(userId, createPetDto);
  }

  @Get()
  findAll(@Request() req: ExpressRequest) {
    // Sadece giriş yapan kişinin kendi hayvanlarını getirir
    return this.petsService.findAllMyPets(req.user!.userId);
  }

  // Hayvan detayını almak için kullanılır
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @Request() req: ExpressRequest) {
    const userId = req.user!.userId;
    return this.petsService.findOne(id, userId);
  }

  @Put(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() updatePetDto: UpdatePetDto, @Request() req: ExpressRequest) {
    const userId = req.user!.userId;
    return this.petsService.update(id, userId, updatePetDto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Request() req: ExpressRequest) {
    const userId = req.user!.userId;
    return this.petsService.remove(id, userId);
  }

  @Patch(':id/set-default')
  async setDefaultPet(@Param('id', new ParseUUIDPipe()) id: string, @Request() req: ExpressRequest) {
    const userId = req.user!.userId;
    return this.petsService.setDefaultPet(id, userId);
  }

}