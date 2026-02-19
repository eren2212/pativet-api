// update-pet.dto.ts
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, MaxLength, IsDate } from 'class-validator';

export class UpdatePetDto {

    // Sadece gönderilirse güncellenecek (IsOptional)
    @IsOptional()
    @IsString({ message: 'İsim geçerli bir metin olmalıdır.' })
    name?: string;

    @IsOptional()
    @IsString({ message: 'Irk bilgisi geçerli bir metin olmalıdır.' })
    breed?: string;

    @IsOptional()
    @IsString()
    gender?: string;

    // Kilo ondalıklı bir sayı olabileceği için IsNumber kullanıyoruz
    @IsOptional()
    @IsNumber({}, { message: 'Kilo geçerli bir sayı olmalıdır.' })
    weight?: number;

    // Çip numaraları genelde belirli bir uzunluktadır, veritabanını şişirmemek için sınır koymak iyidir.
    @IsOptional()
    @IsString()
    @MaxLength(30, { message: 'Çip numarası çok uzun.' })
    chip_number?: string;

    // Frontend'den ISO 8601 formatında (örn: 2022-05-15T00:00:00.000Z) gelmesini bekleriz.
    @IsOptional()
    @Type(() => Date)
    @IsDate({ message: 'Doğum tarihi geçerli bir tarih olmalıdır.' })
    birth_date?: Date;

}