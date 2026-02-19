import { Exclude, Expose } from 'class-transformer';

export class PetDetailResponseDto {
    @Expose()
    id: string;

    @Expose()
    name: string;

    @Expose()
    species: string;

    @Expose()
    breed: string | null;

    @Expose()
    gender: string | null;

    @Expose()
    weight: number | null;

    @Expose()
    chip_number: string | null;

    @Expose()
    avatar_url: string | null;

    // 1. ADIM: Orijinal doğum tarihini frontend'den gizliyoruz
    @Exclude()
    birth_date: Date | null;

    // 2. ADIM: Yaş hesaplamasını yapıp yeni bir alan olarak dışarı açıyoruz
    @Expose()
    get age(): string | null {
        if (!this.birth_date) return null; // Doğum tarihi girilmemişse null dön

        const today = new Date();
        const birthDate = new Date(this.birth_date);

        let years = today.getFullYear() - birthDate.getFullYear();
        const monthsDiff = today.getMonth() - birthDate.getMonth();

        // Eğer o yılki doğum günü henüz gelmediyse yaşı 1 düşür
        if (monthsDiff < 0 || (monthsDiff === 0 && today.getDate() < birthDate.getDate())) {
            years--;
        }

        // Hayvan 1 yaşından küçükse aylık olarak hesapla
        if (years === 0) {
            let months = (today.getFullYear() - birthDate.getFullYear()) * 12 + monthsDiff;
            if (today.getDate() < birthDate.getDate()) {
                months--;
            }
            // Eğer 1 aydan da küçükse gün hesabı yapılabilir ama şimdilik "0 Aylık" veya "Yeni Doğan" diyebiliriz
            return months > 0 ? `${months} Aylık` : 'Yeni Doğan';
        }

        return `${years} Yaşında`;
    }

    @Exclude()
    owner_id: string;

    @Exclude()
    created_at: Date | null;

    constructor(partial: Partial<PetDetailResponseDto>) {
        Object.assign(this, partial);
    }
}