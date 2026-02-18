import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreatePetDto } from './dto/create-pet.dto.js';

@Injectable()
export class PetsService {
    // 1. Logger'ı kendi sınıf ismiyle başlatıyoruz.
    // Loglarda [PetsService] diye görünecek, hatanın nerede olduğunu şak diye anlayacaksın.
    private readonly logger = new Logger(PetsService.name);

    constructor(private prisma: PrismaService) { }

    async create(createPetDto: CreatePetDto, userId: string) {
        try {
            // İşlem başlangıcını logluyoruz (Info seviyesi)
            this.logger.log(`Kullanıcı (${userId}) için yeni evcil hayvan oluşturuluyor: ${createPetDto.name}`);

            const pet = await this.prisma.pets.create({
                data: {
                    ...createPetDto,
                    owner_id: userId,
                },
            });

            // İşlem başarısını logluyoruz
            this.logger.log(`Evcil hayvan başarıyla oluşturuldu. PetID: ${pet.id}`);
            return pet;

        } catch (error) {
            // 2. Hata anında KIRMIZI alarm! (Error seviyesi)
            // error.stack sayesinde hatanın hangi satırda olduğunu görebileceksin.
            this.logger.error(
                `Evcil hayvan oluşturulurken hata oluştu! UserID: ${userId}`,
                error instanceof Error ? error.stack : error,
            );

            // 3. Kullanıcıya temiz bir hata mesajı dönüyoruz.
            // Veritabanı hatasını (SQL hatasını) gizliyoruz.
            throw new InternalServerErrorException('Evcil hayvan oluşturulamadı, lütfen bilgileri kontrol edip tekrar deneyin.');
        }
    }

    async findAllMyPets(userId: string) {
        try {
            this.logger.log(`Kullanıcı (${userId}) tüm evcil hayvanlarını listeliyor...`);

            const pets = await this.prisma.pets.findMany({
                where: {
                    owner_id: userId,
                },
                orderBy: {
                    created_at: 'desc', // En son ekleneni en üstte getirir, şık durur
                },
            });

            if (!pets || pets.length === 0) {
                this.logger.warn(`Kullanıcının (${userId}) hiç hayvanı yok.`);
            }

            return pets;

        } catch (error) {
            this.logger.error(`Hayvanlar listelenirken hata: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : 'Unknown stack');
            throw new InternalServerErrorException('Hayvan listesi getirilemedi.');
        }
    }
}