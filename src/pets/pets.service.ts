import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { PetDetailResponseDto } from './dto/pet-detail-response.dto.js';
import { UpdatePetDto } from './dto/pet-update.dto.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

@Injectable()
export class PetsService {
    // 1. Logger'ı kendi sınıf ismiyle başlatıyoruz.
    // Loglarda [PetsService] diye görünecek, hatanın nerede olduğunu şak diye anlayacaksın.
    private readonly logger = new Logger(PetsService.name);
    private supabase: SupabaseClient<any, 'public', any>;

    constructor(private prisma: PrismaService) {

        this.supabase = createClient<any, 'public', any>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }

    // Evcil hayvan oluşturmak için kullanılır
    async create(userId: string, createPetDto: CreatePetDto): Promise<PetDetailResponseDto> {

        // 1. YENİ PETİ OLUŞTUR
        // DTO'dan gelen verilerle peti veritabanına yazıyoruz
        const newPet = await this.prisma.pets.create({
            data: {
                ...createPetDto,
                owner_id: userId,
            },
        });

        // 2. KULLANICININ PROFİLİNİ KONTROL ET
        // Sadece default_pet_id alanını çekmek performansı artırır (Tüm profili çekmeye gerek yok)
        const userProfile = await this.prisma.profiles.findUnique({
            where: {
                id: userId
            },
            select: {
                default_pet_id: true
            },
        });

        // 3. İLK PET MANTĞI (OTOMATİK ATAMA)
        // Eğer kullanıcının şu an varsayılan bir peti yoksa, bu yeni peti varsayılan yap!
        if (!userProfile?.default_pet_id) {
            await this.prisma.profiles.update({
                where: {
                    id: userId
                },
                data: {
                    default_pet_id: newPet.id
                },
            });
        }

        // 4. TERTEMİZ DTO İLE YANIT DÖN
        return new PetDetailResponseDto({
            ...newPet,
            weight: newPet.weight ? newPet.weight.toNumber() : undefined,
        });
    }

    // Kullanıcının tüm evcil hayvanlarını listelemek için kullanılır
    async findAllMyPets(userId: string) {
        try {
            this.logger.log(`Kullanıcı (${userId}) tüm evcil hayvanlarını listeliyor...`);

            // 1. Ortak WHERE koşulumuzu bir değişkene atıyoruz ki iki sorguda da aynı kodu yazmayalım
            const whereCondition = {
                owner_id: userId,
                deleted_at: null,
            };

            // 2. Promise.all ile aynı anda hem petleri hem de toplam sayıyı (count) çekiyoruz
            const [pets, totalCount] = await Promise.all([
                this.prisma.pets.findMany({
                    where: whereCondition,
                    select: {
                        id: true,
                        name: true,
                        breed: true,
                        avatar_url: true,
                    },
                    orderBy: {
                        created_at: 'desc', // En son ekleneni en üstte getirir, şık durur
                    },
                }),
                this.prisma.pets.count({
                    where: whereCondition,
                })
            ]);

            if (totalCount === 0) {
                this.logger.warn(`Kullanıcının (${userId}) hiç hayvanı yok.`);
            }

            // 3. Frontend tarafına veriyi ve sayıyı güzel bir obje (JSON) halinde dönüyoruz
            return {
                data: pets,
                count: totalCount
            };

        } catch (error) {
            this.logger.error(`Hayvanlar listelenirken hata: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : 'Unknown stack');
            throw new InternalServerErrorException('Hayvan listesi getirilemedi.');
        }
    }

    // Kullanıcının bir evcil hayvanını detaylı bir şekilde görüntülemek için kullanılır
    async findOne(id: string, userId: string): Promise<PetDetailResponseDto> {

        const pet = await this.prisma.pets.findFirst({
            where: {
                id,
                owner_id: userId,
                deleted_at: null,
            },
        });

        if (!pet) {
            throw new NotFoundException('Hayvan bulunamadı.');
        }

        return new PetDetailResponseDto(
            {
                ...pet,
                weight: pet.weight ? pet.weight.toNumber() : undefined,
            }
        );
    }

    // Kullanıcının bir evcil hayvanını güncellemek için kullanılır
    async update(petId: string, userId: string, updatePetDto: UpdatePetDto): Promise<PetDetailResponseDto> {

        // 1. GÜVENLİK KONTROLÜ: Bu pet gerçekten var mı ve bu kullanıcıya mı ait?
        const existingPet = await this.prisma.pets.findFirst({
            where: {
                id: petId,
                owner_id: userId,
            },
        });

        if (!existingPet) {
            // Eğer pet yoksa veya başkasınınsa, hacker'a veya kullanıcıya bilgi vermemek için
            // genel bir "Bulunamadı" hatası dönmek en güvenli yoldur.
            throw new NotFoundException('Güncellenecek pet bulunamadı veya bu işlem için yetkiniz yok.');
        }

        // 2. GÜNCELLEME İŞLEMİ
        // Prisma, updatePetDto içindeki undefined (gönderilmeyen) alanları yoksayar,
        // sadece kullanıcının gönderdiği (dolu olan) alanları günceller.
        const updatedPet = await this.prisma.pets.update({
            where: {
                id: petId, // Güvenlik kontrolünü geçtiğimiz için artık gönül rahatlığıyla id verebiliriz
            },
            data: {
                ...updatePetDto,
            },
        });

        // 3. TUTARLI YANIT (RESPONSE)
        // Güncel veriyi, az önce yazdığımız Response DTO'muzdan geçirerek tertemiz bir şekilde dönüyoruz.
        // Yine Decimal(weight) hatası almamak için toNumber() dönüşümünü yapıyoruz.
        return new PetDetailResponseDto({
            ...updatedPet,
            weight: updatedPet.weight ? updatedPet.weight.toNumber() : undefined,
        });
    }

    // Kullanıcının bir evcil hayvanını silmek için kullanılır
    async remove(petId: string, userId: string): Promise<{ message: string; success: boolean }> {

        // 1. GÜVENLİK KONTROLÜ
        const existingPet = await this.prisma.pets.findFirst({
            where: {
                id: petId,
                owner_id: userId,
                deleted_at: null, // ÖNEMLİ: Zaten silinmiş bir peti tekrar silmeye çalışmasını engelliyoruz
            },
        });

        if (!existingPet) {
            throw new NotFoundException('Silinecek evcil hayvan bulunamadı veya bu işlem için yetkiniz yok.');
        }

        // 2. SOFT DELETE (Gizleme İşlemi)
        await this.prisma.pets.update({
            where: {
                id: petId,
            },
            data: {
                deleted_at: new Date(), // O anın tarih ve saatini mühürlüyoruz
            },
        });

        // 3. BAŞARILI YANIT
        return {
            success: true,
            message: `${existingPet.name} isimli evcil hayvan sistemden başarıyla kaldırıldı.`
        };
    }

    // Kullanıcının bir evcil hayvanını varsayılan hayvanı olarak ayarlamak için kullanılır
    async setDefaultPet(petId: string, userId: string): Promise<{ success: boolean; message: string }> {

        // 1. GÜVENLİK KONTROLÜ: Bu pet kullanıcının mı ve hala hayatta mı (silinmemiş mi)?
        const pet = await this.prisma.pets.findFirst({
            where: {
                id: petId,
                owner_id: userId,
                deleted_at: null, // Silinmiş bir pet varsayılan olamaz!
            },
        });

        if (!pet) {
            throw new NotFoundException('Evcil hayvan bulunamadı veya bu işlem için yetkiniz yok.');
        }

        // 2. GÜNCELLEME İŞLEMİ: Kullanıcının profilindeki default_pet_id alanını güncelliyoruz
        await this.prisma.profiles.update({
            where: {
                id: userId, // Profil ID'si zaten User ID ile aynı
            },
            data: {
                default_pet_id: petId,
            },
        });

        // 3. BAŞARILI YANIT
        return {
            success: true,
            message: `${pet.name} artık varsayılan evcil hayvanınız olarak ayarlandı.`,
        };
    }

    // Kullanıcının bir evcil hayvanının avatarını yüklemek için kullanılır
    async uploadAvatar(
        petId: string,
        userId: string,
        file: { originalname: string; buffer: Buffer; mimetype: string }
    ) {
        // 1. Peti bul (Eski avatar_url burada pet objesinin içinde elimizde olacak)
        const pet = await this.prisma.pets.findFirst({
            where: { id: petId, owner_id: userId, deleted_at: null },
        });

        if (!pet) {
            throw new NotFoundException('Evcil hayvan bulunamadı veya bu işlem için yetkiniz yok.');
        }

        // 2. YENİ DOSYA ADINI OLUŞTUR
        const fileExt = extname(file.originalname);
        const uniqueFileName = `${petId}-${uuidv4()}${fileExt}`;

        // 3. YENİ RESMİ YÜKLE
        const { error: uploadError } = await this.supabase.storage
            .from('pet-avatars')
            .upload(uniqueFileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });

        if (uploadError) {
            console.error('Supabase Storage Yükleme Hatası:', uploadError);
            throw new InternalServerErrorException('Fotoğraf yüklenirken bulut sunucusunda bir hata oluştu.');
        }

        // 4. ESKİ RESMİ SİLME İŞLEMİ (Bucket Patlamasını Önlüyor!)
        // Sadece petin halihazırda bir fotoğrafı varsa ve bu bizim storage'dan geliyorsa sil
        if (pet.avatar_url && pet.avatar_url.includes('pet-avatars')) {
            // URL'den sadece dosya adını koparıp alıyoruz. 
            // Örn: https://.../pet-avatars/d267-pamuk.jpg -> "d267-pamuk.jpg"
            const urlParts = pet.avatar_url.split('/');
            const oldFileName = urlParts[urlParts.length - 1];

            // Dosyayı Supabase'den siliyoruz
            const { error: removeError } = await this.supabase.storage
                .from('pet-avatars')
                .remove([oldFileName]);

            if (removeError) {
                // Silme başarısız olursa NestJS'i çökertmeyiz, adam yeni fotoğrafını yükledi sonuçta.
                // Sadece terminale log basarız ki arka planda ne olduğunu bilelim.
                console.warn(`[UYARI] Eski avatar silinemedi (Pet ID: ${petId}):`, removeError.message);
            }
        }

        // 5. YENİ PUBLIC URL'İ AL VE DB'Yİ GÜNCELLE
        const { data: { publicUrl } } = this.supabase.storage
            .from('pet-avatars')
            .getPublicUrl(uniqueFileName);

        await this.prisma.pets.update({
            where: { id: petId },
            data: { avatar_url: publicUrl },
        });

        return {
            success: true,
            message: 'Fotoğraf başarıyla güncellendi.',
            avatar_url: publicUrl
        };
    }

}