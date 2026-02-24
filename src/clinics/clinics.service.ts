import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { GetClinicsFilterDto } from './dto/get-clinics-filter.dto.js';
import { ClinicListResponseDto } from './dto/clinic-list-response.dto.js'; // YENİ DTO EKLENDİ

// SADECE 5 KOLON KALDI
export interface RawClinicListData {
    id: string;
    name: string;
    rating: number | string;
    is_open_24_7: boolean;
    distance_meters: number | null;
}

@Injectable()
export class ClinicsService {
    constructor(private prisma: PrismaService) { }

    async findAll(filterDto: GetClinicsFilterDto) {
        try {
            const { lat, lng, search, is_24_7, top_rated } = filterDto;

            const clinicsData = await this.prisma.$queryRaw<RawClinicListData[]>`
        SELECT * FROM get_clinics_with_filters(
          ${lat ?? null}::float8, 
          ${lng ?? null}::float8, 
          ${search ?? null}::text, 
          ${is_24_7 ?? null}::boolean, 
          ${top_rated ?? null}::boolean
        )
      `;

            const results = Array.isArray(clinicsData) ? clinicsData : [];

            return {
                success: true,
                count: results.length,
                data: results.map((clinic) => new ClinicListResponseDto({
                    id: clinic.id,
                    name: clinic.name,
                    is_open_24_7: clinic.is_open_24_7,
                    rating: Number(clinic.rating),
                    distance_meters: clinic.distance_meters != null ? Math.round(clinic.distance_meters) : undefined,
                })),
            };

        } catch (error) {
            console.error('Klinikler çekilirken hata:', error);
            throw new InternalServerErrorException('Klinik listesi getirilemedi.');
        }
    }
}