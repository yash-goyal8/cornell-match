import { z } from 'zod';

// Sanitization utilities
export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple whitespace to single space
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters
};

export const sanitizeUrl = (url: string): string => {
  return url.trim();
};

// LinkedIn URL validation helper
const isValidLinkedInUrl = (url: string): boolean => {
  if (!url) return true; // Empty is valid (optional field)
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('linkedin.com');
  } catch {
    return false;
  }
};

// Profile validation schema
export const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .transform(sanitizeText),
  program: z.string().min(1, 'Program is required'),
  skills: z.array(z.string().max(50)).max(20, 'Maximum 20 skills allowed').default([]),
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizeText(val) : val)),
  studioPreference: z.string().min(1, 'Studio preference is required'),
  studioPreferences: z.array(z.string()).optional().default([]),
  avatar: z.string().url('Invalid avatar URL').optional().nullable().or(z.literal('')),
  linkedIn: z
    .string()
    .max(200, 'LinkedIn URL must be less than 200 characters')
    .optional()
    .nullable()
    .refine((val) => !val || isValidLinkedInUrl(val), {
      message: 'Must be a valid LinkedIn URL',
    })
    .transform((val) => (val ? sanitizeUrl(val) : val)),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileValidated = z.output<typeof profileSchema>;

// Team validation schema
export const teamSchema = z.object({
  name: z
    .string()
    .min(3, 'Team name must be at least 3 characters')
    .max(100, 'Team name must be less than 100 characters')
    .transform(sanitizeText),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizeText(val) : val)),
  studio: z.string().min(1, 'Studio is required'),
  lookingFor: z
    .string()
    .max(500, 'Looking for must be less than 500 characters')
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizeText(val) : val)),
  skillsNeeded: z.array(z.string().max(50)).max(20, 'Maximum 20 skills allowed').default([]),
});

export type TeamInput = z.input<typeof teamSchema>;
export type TeamValidated = z.output<typeof teamSchema>;

// Message validation schema
export const messageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message must be less than 5000 characters')
    .transform(sanitizeText),
  conversationId: z.string().uuid('Invalid conversation ID'),
  senderId: z.string().uuid('Invalid sender ID'),
});

export type MessageInput = z.input<typeof messageSchema>;
export type MessageValidated = z.output<typeof messageSchema>;

// Validation helper function
export const validateInput = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessage = result.error.errors.map((e) => e.message).join(', ');
  return { success: false, error: errorMessage };
};
