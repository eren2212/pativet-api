import { IsOptional, IsNumber, IsBoolean, IsString, Min, Max } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer'; // TransformFnParams eklendi

export class GetClinicsFilterDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    // ÇÖZÜM: TransformFnParams tipini verdik ve value'yu String'e zorladık
    @Transform(({ value }: TransformFnParams) => parseFloat(String(value)))
    @IsNumber({}, { message: 'Enlem (lat) geçerli bir sayı olmalıdır.' })
    @Min(-90)
    @Max(90)
    lat?: number;

    @IsOptional()
    @Transform(({ value }: TransformFnParams) => parseFloat(String(value)))
    @IsNumber({}, { message: 'Boylam (lng) geçerli bir sayı olmalıdır.' })
    @Min(-180)
    @Max(180)
    lng?: number;

    @IsOptional()
    // ÇÖZÜM: Gelen veri metin ("true") veya zaten boolean (true) olabilir, ikisini de kapsadık
    @Transform(({ value }: TransformFnParams) => value === 'true' || value === true)
    @IsBoolean()
    is_24_7?: boolean;

    @IsOptional()
    @Transform(({ value }: TransformFnParams) => value === 'true' || value === true)
    @IsBoolean()
    top_rated?: boolean;
}