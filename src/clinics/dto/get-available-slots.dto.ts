// src/clinics/dto/get-available-slots.dto.ts
import { IsDateString, IsNotEmpty } from 'class-validator';

export class GetAvailableSlotsDto {
    @IsDateString()
    @IsNotEmpty()
    date: string; // Örn: '2023-10-11' formatında gelmeli
}