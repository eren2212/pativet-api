import { ConflictException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { GetClinicsFilterDto } from './dto/get-clinics-filter.dto.js';
import { ClinicListResponseDto } from './dto/clinic-list-response.dto.js';
import { ClinicResponseDto } from './dto/clinic-response.dto.js';
import { ClinicWorkingHoursDto } from './dto/clinic-response.dto.js';
import { NotFoundException } from '@nestjs/common';
import { GetAvailableSlotsDto } from './dto/get-available-slots.dto.js';
import { ReserveSlotDto } from './dto/reserve-slot.dto.js';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfirmReservationDto } from './dto/confirm-reservation.dto.js';
import { ReservationSummaryDto } from './dto/reservation-summary.dto.js';


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

    private readonly logger = new Logger(ClinicsService.name);

    // Zamanı dakikaya çeviren yardımcı fonksiyon ('09:30' -> 570)
    private timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // Dakikayı saate çeviren yardımcı fonksiyon (570 -> '09:30')
    private minutesToTime(minutes: number): string {
        const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
        const mins = (minutes % 60).toString().padStart(2, '0');
        return `${hours}:${mins}`;
    }

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


    async getAvailableSlots(clinicId: string, query: GetAvailableSlotsDto) {
        const requestedDate = new Date(query.date);
        const dayOfWeek = requestedDate.getDay(); // 0: Pazar, 1: Pazartesi ...

        // 1. Klinik ve o güne ait çalışma saatlerini çek
        const clinic = await this.prisma.clinics.findUnique({
            where: { id: clinicId },
            include: {
                clinic_working_hours: {
                    where: { day_of_week: dayOfWeek },
                },
            },
        });

        if (!clinic) throw new NotFoundException('Klinik bulunamadı');

        const workingHours = clinic.clinic_working_hours[0];

        // Eğer o gün kapalıysa veya çalışma saati girilmemişse boş dön
        if (!workingHours || workingHours.is_closed) {
            return { sabah: [], ogledenSonra: [] };
        }

        // 2. O güne ait "Dolu" randevuları çek
        // İŞTE KRİTİK NOKTA: Sadece geçerli randevuları çekiyoruz.
        const startOfDay = new Date(requestedDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(requestedDate.setHours(23, 59, 59, 999));

        const bookedAppointments = await this.prisma.appointments.findMany({
            where: {
                clinic_id: clinicId,
                appointment_date: { gte: startOfDay, lte: endOfDay },
                NOT: { status: 'cancelled' },
                OR: [
                    // Onaylanmış veya tamamlanmış randevular
                    { status: { in: ['pending', 'confirmed', 'completed'] } },
                    // VEYA statüsü reserved olan ama 10 dakikalık süresi HENÜZ DOLMAMIŞ olanlar
                    {
                        status: 'reserved',
                        expires_at: { gt: new Date() } // Şu andan ilerideyse hala kilitlidir
                    }
                ]
            },
            select: { appointment_date: true }
        });

        // Dolu saatlerin listesini 'HH:mm' formatında bir diziye al
        const bookedTimes = bookedAppointments.map(app => {
            // getHours() yerine güvenli olan Intl formatlayıcıyı kullanıyoruz
            const timeFormatter = new Intl.DateTimeFormat('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Istanbul' // Her zaman Türkiye saati!
            });
            return timeFormatter.format(app.appointment_date); // "14:30" döner
        });

        // 3. Slotları Oluştur
        const slots: { sabah: string[]; ogledenSonra: string[] } = {
            sabah: [],
            ogledenSonra: []
        };

        const duration = clinic.appointment_duration; // Default 30

        if (!workingHours.open_time || !workingHours.close_time) {
            return slots;
        }

        let currentMin = this.timeToMinutes(workingHours.open_time);
        const closeMin = this.timeToMinutes(workingHours.close_time);
        const breakStartMin = workingHours.break_start ? this.timeToMinutes(workingHours.break_start) : null;
        const breakEndMin = workingHours.break_end ? this.timeToMinutes(workingHours.break_end) : null;

        // --- YENİ EKLENEN KISIM: BUGÜNÜN GEÇMİŞ SAATLERİNİ BULMA ---
        // 1. Şu anki tarihi Türkiye saatine göre YYYY-MM-DD formatında al
        const todayStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Istanbul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        // 2. Kullanıcının seçtiği tarih bugün mü kontrol et (query.date örn: '2026-03-03')
        const isToday = query.date === todayStr;

        // 3. Eğer bugünse, şu anki saati dakikaya çevir
        let currentMinutesNow = 0;
        if (isToday) {
            const timeFormatter = new Intl.DateTimeFormat('tr-TR', {
                timeZone: 'Europe/Istanbul',
                hour: '2-digit',
                minute: '2-digit'
            });
            const [hours, minutes] = timeFormatter.format(new Date()).split(':').map(Number);
            currentMinutesNow = hours * 60 + minutes;
        }
        // -----------------------------------------------------------

        while (currentMin + duration <= closeMin) {
            const slotStartMin = currentMin;
            const slotEndMin = currentMin + duration;

            let isDuringBreak = false;
            if (breakStartMin !== null && breakEndMin !== null) {
                if ((slotStartMin >= breakStartMin && slotStartMin < breakEndMin) ||
                    (slotEndMin > breakStartMin && slotEndMin <= breakEndMin)) {
                    isDuringBreak = true;
                }
            }

            const timeString = this.minutesToTime(slotStartMin);

            // GEÇMİŞ SAAT KONTROLÜ: Eğer günlerden bugünse ve bu slot şu anki saatten geçmişteyse/şimdiye eşitse
            const isPastSlot = isToday && slotStartMin <= currentMinutesNow;

            // ŞARTLARA GEÇMİŞ SAAT KONTROLÜNÜ (!isPastSlot) EKLEDİK
            if (!isDuringBreak && !bookedTimes.includes(timeString) && !isPastSlot) {
                if (slotStartMin < 12 * 60) {
                    slots.sabah.push(timeString);
                } else {
                    slots.ogledenSonra.push(timeString);
                }
            }

            if (isDuringBreak && breakEndMin !== null && currentMin < breakEndMin) {
                currentMin = breakEndMin;
            } else {
                currentMin += duration;
            }
        }

        return slots;
    }

    async reserveSlot(clinicId: string, ownerId: string, dto: ReserveSlotDto) {
        const requestedDate = new Date(dto.appointmentDate);

        // 1. KONTROL: Bu saat hala boş mu?
        const existingAppointment = await this.prisma.appointments.findFirst({
            where: {
                clinic_id: clinicId,
                appointment_date: requestedDate,
                NOT: { status: 'cancelled' },
                OR: [
                    { status: { in: ['pending', 'confirmed', 'completed'] } },
                    {
                        status: 'reserved',
                        expires_at: { gt: new Date() }
                    }
                ]
            }
        });

        if (existingAppointment) {
            throw new ConflictException('Maalesef bu randevu saati az önce başka biri tarafından rezerve edildi.');
        }

        // 2. KİLİDİ OLUŞTUR (Şu an + 10 Dakika)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // 3. Veritabanına kaydet
        const reservation = await this.prisma.appointments.create({
            data: {
                clinic_id: clinicId,
                pet_id: dto.petId,
                owner_id: ownerId, // Artık JWT'den gelen temiz ID'yi kullanıyoruz
                appointment_date: requestedDate,
                status: 'reserved',
                expires_at: expiresAt
            }
        });

        return {
            message: 'Randevu başarıyla 10 dakikalığına rezerve edildi.',
            reservationId: reservation.id,
            expiresAt: reservation.expires_at,
        };
    }

    async getReservationSummary(reservationId: string, userId: string): Promise<ReservationSummaryDto> {
        const reservation = await this.prisma.appointments.findFirst({
            where: {
                id: reservationId,
                owner_id: userId,
                status: 'reserved',
                expires_at: { gt: new Date() }
            },
            // Prisma'dan yine sadece ihtiyacımız olanları çekiyoruz ki veritabanı yorulmasın
            select: {
                appointment_date: true,
                clinics: {
                    select: { name: true }
                },
                pets: {
                    select: { name: true, species: true }
                }
            }
        });

        if (!reservation) {
            throw new NotFoundException('Randevu bulunamadı veya onay süresi (10 dk) doldu. Lütfen tekrar deneyin.');
        }

        // Gelen veriyi DTO'muza döküp Controller'a o şekilde yolluyoruz
        return new ReservationSummaryDto(reservation);
    }

    async confirmReservation(reservationId: string, userId: string, dto: ConfirmReservationDto) {
        // Önce randevunun hala geçerli olup olmadığını kontrol edelim
        const reservation = await this.prisma.appointments.findFirst({
            where: {
                id: reservationId,
                owner_id: userId,
                status: 'reserved',
                expires_at: { gt: new Date() }
            }
        });

        if (!reservation) {
            throw new ConflictException('Bu randevunun onay süresi dolmuş veya iptal edilmiş. Lütfen yeni bir saat seçin.');
        }

        // Her şey yolundaysa Güncelle ve Kilidi Kaldır!
        const confirmedAppointment = await this.prisma.appointments.update({
            where: { id: reservationId },
            data: {
                status: 'pending', // Artık veteriner onayı bekliyor
                expires_at: null, // Sayacı durdurduk (Cron Job artık bunu silmeyecek)
                reason: dto.reason,
            },
            include: {
                clinics: { select: { name: true } }
            }
        });

        return {
            message: 'Randevunuz başarıyla oluşturuldu. Klinik onayladığında size bildirim gelecektir.',
            appointmentId: confirmedAppointment.id,
            status: confirmedAppointment.status
        };
    }


    async cancelReservation(reservationId: string, userId: string) {
        const reservation = await this.prisma.appointments.findFirst({
            where: {
                id: reservationId,
                owner_id: userId,
                status: 'reserved',
            }
        });

        if (!reservation) {
            throw new NotFoundException('İptal edilecek rezervasyon bulunamadı.');
        }

        await this.prisma.appointments.delete({
            where: { id: reservationId },
        });

        return { message: 'Rezervasyon başarıyla iptal edildi.' };
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async cleanupExpiredReservations() {
        try {
            // statüsü 'reserved' olan VE expires_at değeri ŞU ANDAN KÜÇÜK olanları bul ve sil
            const result = await this.prisma.appointments.deleteMany({
                where: {
                    status: 'reserved',
                    expires_at: { lt: new Date() } // lt: less than (küçüktür)
                }
            });

            if (result.count > 0) {
                this.logger.log(`Çöpçü çalıştı: ${result.count} adet süresi dolmuş sahipsiz randevu silindi 🧹`);
            }
        } catch (error) {
            this.logger.error('Süresi dolan randevuları temizlerken bir hata oluştu', error);
        }
    }
}