import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards, ValidationPipe, Body, Request, Patch } from '@nestjs/common';
import { ClinicsService } from './clinics.service.js';
import { GetClinicsFilterDto } from './dto/get-clinics-filter.dto.js';
import { GetAvailableSlotsDto } from './dto/get-available-slots.dto.js';
import { AuthGuard } from '@nestjs/passport';
import { ReserveSlotDto } from './dto/reserve-slot.dto.js';
import type { Request as ExpressRequest } from 'express';
import { ConfirmReservationDto } from './dto/confirm-reservation.dto.js';


@Controller('clinics')
@UseGuards(AuthGuard('jwt'))
export class ClinicsController {
    constructor(private readonly clinicsService: ClinicsService) { }

    @Get()
    async findAll(
        // transform: true diyerek DTO'daki o çevirme işlemlerini (sayıya/booleana) aktif ediyoruz
        @Query(new ValidationPipe({ transform: true })) filterDto: GetClinicsFilterDto,
    ) {
        // Controller sadece gelen veriyi temizler ve Service'e paslar. İşin beyni Service'dir.
        return this.clinicsService.findAll(filterDto);
    }


    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.clinicsService.findOne(id);
    }


    @Get(':id/available-slots')
    async getAvailableSlots(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: GetAvailableSlotsDto,
    ) {
        return this.clinicsService.getAvailableSlots(id, query);
    }

    @Post(':id/reserve')
    async reserveSlot(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReserveSlotDto, @Request() req: ExpressRequest) {
        const userId = req.user!.userId;
        return this.clinicsService.reserveSlot(id, userId, dto);
    }

    @Get('reservations/:reservationId/summary')
    async getReservationSummary(
        @Param('reservationId', ParseUUIDPipe) reservationId: string,
        @Request() req: ExpressRequest
    ) {
        const userId = req.user!.userId;
        return this.clinicsService.getReservationSummary(reservationId, userId);
    }


    @Patch('reservations/:reservationId/cancel')
    async cancelReservation(
        @Param('reservationId', ParseUUIDPipe) reservationId: string,
        @Request() req: ExpressRequest
    ) {
        const userId = req.user!.userId;
        return this.clinicsService.cancelReservation(reservationId, userId);
    }

    @Patch('reservations/:reservationId/confirm')
    async confirmReservation(
        @Param('reservationId', ParseUUIDPipe) reservationId: string,
        @Body() dto: ConfirmReservationDto,
        @Request() req: ExpressRequest
    ) {
        const userId = req.user!.userId;
        return this.clinicsService.confirmReservation(reservationId, userId, dto);
    }

}