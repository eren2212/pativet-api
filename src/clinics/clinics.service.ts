import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { GetClinicsFilterDto } from './dto/get-clinics-filter.dto.js';
import { ClinicListResponseDto } from './dto/clinic-list-response.dto.js';
import { ClinicResponseDto } from './dto/clinic-response.dto.js';
import { ClinicWorkingHoursDto } from './dto/clinic-response.dto.js';
import { NotFoundException } from '@nestjs/common';


export interface RawClinicListData {
    id: string;
    name: string;
    rating: number | string;
    is_open_24_7: boolean;
    distance_meters: number | null;
    working_hours: ClinicWorkingHoursDto[];
}

@Injectable()
export class ClinicsService {
    constructor(private prisma: PrismaService) { }

    // Klinikleri filtrelemek için kullanılır
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
                    working_hours: clinic.working_hours || [], // Frontend'e bu diziyi paslıyoruz
                })),
            };

        } catch (error) {
            console.error('Klinikler çekilirken hata:', error);
            throw new InternalServerErrorException('Klinik listesi getirilemedi.');
        }
    }

    // Bir kliniki detaylı bir şekilde görüntülemek için kullanılır
    async findOne(id: string) {
        try {
            // 1. Prisma ile kliniği ve ilişkili olduğu çalışma saatlerini çekiyoruz
            const clinic = await this.prisma.clinics.findUnique({
                where: { id },
                include: {
                    // Çalışma saatlerini gün sırasına (Pazartesi->Pazar) göre sıralı getir
                    clinic_working_hours: {
                        orderBy: { day_of_week: 'asc' },
                    },
                },
            });

            // 2. Eğer o ID'ye ait bir klinik yoksa anında 404 fırlatıyoruz
            if (!clinic) {
                throw new NotFoundException('Klinik bulunamadı veya sistemden kaldırılmış.');
            }

            // 3. Ham veriyi, frontend'in beklediği DTO kalıbına döküyoruz
            const mappedClinic = new ClinicResponseDto({
                id: clinic.id,
                name: clinic.name,
                address: clinic.address,
                phone_number: clinic.phone_number,
                about: clinic.about,
                rating: clinic.rating ? Number(clinic.rating) : 0, // Decimal -> Number
                is_open_24_7: clinic.is_open_24_7 ?? false,
                latitude: clinic.latitude,
                longitude: clinic.longitude,
                appointment_duration: clinic.appointment_duration,

                // İlişkisel tabloyu da kendi içindeki DTO'suna mapliyoruz
                working_hours: clinic.clinic_working_hours.map((hours) => ({
                    day_of_week: hours.day_of_week,
                    is_closed: hours.is_closed ?? false,
                    open_time: hours.open_time,
                    close_time: hours.close_time,
                    break_start: hours.break_start,
                    break_end: hours.break_end,
                }) as ClinicWorkingHoursDto),
            });

            // 4. Standart yanıtımızı dönüyoruz
            return {
                success: true,
                data: mappedClinic,
            };

        } catch (error) {
            // Eğer hata bizim fırlattığımız 404 (NotFound) ise bunu bozmadan yukarı ilet
            if (error instanceof NotFoundException) {
                throw error;
            }
            console.error(`Klinik detayı çekilirken hata (ID: ${id}):`, error);
            throw new InternalServerErrorException('Klinik detayı getirilemedi.');
        }
    }

}