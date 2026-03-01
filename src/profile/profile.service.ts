import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js'; // Prisma yolunu kendi projene göre ayarla
import { ProfileResponseDto } from './dto/profile-response.dto.js';

@Injectable()
export class ProfileService {
    constructor(private readonly prisma: PrismaService) { }

    async getProfile(userId: string): Promise<ProfileResponseDto> {
        // Kullanıcıyı JWT'den gelen ID ile buluyoruz ve sadece 3 alanı çekiyoruz
        const userProfile = await this.prisma.profiles.findUnique({
            where: { id: userId },
            select: {
                full_name: true,
                email: true,
                default_pet_id: true,
            }
        });

        if (!userProfile) {
            throw new NotFoundException('Kullanıcı profili bulunamadı.');
        }

        return new ProfileResponseDto(userProfile);
    }
}