import { IsString, IsNotEmpty, IsOptional, IsDate, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePetDto {
    @IsString()
    @IsNotEmpty({ message: 'Evcil hayvan ismi zorunludur' })
    name!: string;

    @IsString()
    @IsNotEmpty({ message: 'Tür (Kedi/Köpek vb.) zorunludur' })
    species!: string;

    @IsString()
    @IsOptional()
    breed?: string; // Cins

    @IsString()
    @IsOptional()
    gender?: string; // Cinsiyet

    @IsDate()
    @Type(() => Date) // JSON'dan gelen string tarihi Date objesine çevirir
    @IsOptional()
    birth_date?: Date;

    @IsNumber()
    @IsOptional()
    weight?: number;

    @IsString()
    @IsOptional()
    chip_number?: string;

    @IsString()
    @IsOptional()
    avatar_url?: string;

    // DİKKAT: owner_id burada ASLA olmamalı. 
    // Onu kullanıcıdan almayacağız, token'dan biz çalacağız :)
}