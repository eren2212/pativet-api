import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import * as jwksRsa from 'jwks-rsa';

export interface SupabaseJwtPayload {
    sub: string;
    email: string;
    role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // Kanka burayı değiştirdik: RS256 yerine ES256 (veya genel kullanım için ikisi de)
            algorithms: ['ES256', 'RS256'],

            secretOrKeyProvider: jwksRsa.passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                // Buradaki URL'in doğru olduğundan emin ol (ENV dosyanı kontrol et)
                jwksUri: `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co/auth/v1/.well-known/jwks.json`,
            }),
        });
    }

    validate(payload: SupabaseJwtPayload) {
        // ... validate kodun aynı kalabilir
        return {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
        };
    }
}
