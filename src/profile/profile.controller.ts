import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service.js';
import { AuthGuard } from '@nestjs/passport';
import type { Request as ExpressRequest } from 'express';

@Controller('profile')
@UseGuards(AuthGuard('jwt')) // JWT Guard ile koruyoruz
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    // Kullanıcı ID'sini direkt Token'dan alıyoruz (Güvenli yöntem)
    @Get('me')
    async getMyProfile(@Request() req: ExpressRequest) {
        const userId = req.user!.userId;
        return this.profileService.getProfile(userId);
    }
}