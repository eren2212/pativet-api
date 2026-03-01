export class ProfileResponseDto {
    full_name: string | null;
    email: string | null;
    default_pet_id: string | null;

    constructor(partial: Partial<ProfileResponseDto>) {
        Object.assign(this, partial);
    }
}