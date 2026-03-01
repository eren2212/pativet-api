export class ClinicSummaryDto {
    name: string;
}

export class PetSummaryDto {
    name: string;
    species: string;
}

// 1. Prisma'dan servisten gelecek olan HAM verinin tipini tanımlıyoruz
export interface RawReservationData {
    appointment_date: Date;
    clinics: {
        name: string;
    };
    pets: {
        name: string;
        species: string;
    };
}

export class ReservationSummaryDto {
    appointment_date: string;
    clinics: ClinicSummaryDto;
    pets: PetSummaryDto;

    // 2. 'any' YERİNE oluşturduğumuz bu aracı tipi (RawReservationData) kullanıyoruz
    constructor(partial: RawReservationData) {
        const date = new Date(partial.appointment_date);

        // UI Tasarımına BİREBİR uyan formatlayıcı
        const formatter = new Intl.DateTimeFormat('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Istanbul'
        });

        const formattedDate = formatter.format(date).replace(' ', ' ');
        this.appointment_date = formattedDate;

        this.clinics = partial.clinics;
        this.pets = partial.pets;
    }
}