import { Global, Module } from '@nestjs/common';
import { PrismaService } from "./prisma.service.js";


@Global() // Bu sayede tüm projenin her yerinden erişilebilir olacak
@Module({
    providers: [PrismaService],
    exports: [PrismaService], // Diğer servislerin kullanabilmesi için dışarı aktarıyoruz
})
export class PrismaModule { }