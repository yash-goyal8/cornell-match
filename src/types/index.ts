export type Studio = 'bigco' | 'startup' | 'pitech';

export type Program = 'MBA' | 'CM' | 'HealthTech' | 'UrbanTech' | 'MEng-CS' | 'MEng-DS' | 'LLM';

export interface UserProfile {
  id: string;
  name: string;
  program: Program;
  skills: string[];
  bio: string;
  studioPreference: Studio;
  avatar: string;
  linkedIn?: string;
}

export interface Team {
  id: string;
  name: string;
  studio: Studio;
  description: string;
  members: UserProfile[];
  lookingFor: Program[];
  skillsNeeded: string[];
  createdBy: string;
}

export interface Match {
  id: string;
  userId: string;
  targetId: string;
  type: 'individual' | 'team';
  status: 'pending' | 'matched' | 'rejected';
  createdAt: Date;
}
