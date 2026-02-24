// src/clinics/dto/clinic-list-response.dto.ts

export class ClinicListResponseDto {
    id: string;
    name: string;
    rating: number;
    is_open_24_7: boolean;
    distance_meters?: number;

    constructor(partial: Partial<ClinicListResponseDto>) {
        Object.assign(this, partial);
    }
}