// src/clinics/dto/reserve-slot.dto.ts
import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

export class ReserveSlotDto {
    @IsUUID()
    @IsNotEmpty()
    petId: string;


    @IsDateString()
    @IsNotEmpty()
    appointmentDate: string; // Örn: '2026-03-01T14:30:00.000Z'

}