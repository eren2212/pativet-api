import { IsOptional, IsString } from 'class-validator';

export class ConfirmReservationDto {
    @IsString()
    @IsOptional()
    reason?: string; // Ekrandaki text area'dan gelecek veri
}