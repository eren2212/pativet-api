// src/clinics/dto/clinic-list-response.dto.ts
import { ClinicWorkingHoursDto } from './clinic-response.dto.js'; // Yolunu doğru ayarla

export class ClinicListResponseDto {
    id: string;
    name: string;
    rating: number;
    is_open_24_7: boolean;
    distance_meters?: number;
    working_hours: ClinicWorkingHoursDto[]; // Frontend'in beklediği dizi

    constructor(partial: Partial<ClinicListResponseDto>) {
        Object.assign(this, partial);
    }
}