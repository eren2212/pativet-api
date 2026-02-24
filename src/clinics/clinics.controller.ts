import { Controller, Get, Param, ParseUUIDPipe, Query, ValidationPipe } from '@nestjs/common';
import { ClinicsService } from './clinics.service.js';
import { GetClinicsFilterDto } from './dto/get-clinics-filter.dto.js';


@Controller('clinics')
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
}