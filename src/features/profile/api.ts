import { db, type Profile } from '@/db/database';
import { validateProfile } from '@/lib/validation';

export type ProfileInput = Omit<Profile, 'id'>;

export async function saveProfile(input: ProfileInput): Promise<Profile> {
  const profile: Profile = {
    id: 'default',
    ...input,
    name: input.name.trim(),
    school: input.school.trim(),
    role: input.role?.trim(),
    email: input.email?.trim(),
    avatar: input.avatar?.trim(),
  };
  validateProfile(profile);
  await db.profile.put(profile);
  return profile;
}
