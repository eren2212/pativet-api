// src/clinics/dto/clinic-response.dto.ts

export class ClinicWorkingHoursDto {
    day_of_week: number;
    is_closed: boolean;
    open_time: string | null;
    close_time: string | null;
    break_start: string | null;
    break_end: string | null;
}

export class ClinicResponseDto {
    id: string;
    name: string;
    address: string;
    phone_number: string | null;
    rating: number; // Prisma'nın Decimal'ini Number'a çevireceğiz
    is_open_24_7: boolean;
    latitude: number | null;
    longitude: number | null;
    about: string | null;
    appointment_duration: number;
    working_hours: ClinicWorkingHoursDto[]; // İlişkisel tabloyu buraya bağlıyoruz

    // Obje oluşturulurken verileri otomatik atamak için constructor kullanıyoruz
    constructor(partial: Partial<ClinicResponseDto>) {
        Object.assign(this, partial);
    }
}