import { z } from 'zod';
import { WithId } from 'mongodb';
import { config } from 'dotenv';
config().parsed;

export const ProfileSchema = z.object({
  uuid: z.string().uuid().optional(),
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const MailSchema = z.object({
  uuid: z.string().uuid().optional(),
  user_uuid: z.string().uuid('Valid profile UUID required'),
  scraped_data: z.string().min(1, 'Scraped data required'),
  invoice_number: z.string().min(1, 'Invoice number required').optional(),
  vendor_name: z.string().min(1, 'Vendor name required').optional(),
  invoice_date: z.coerce.date().optional(),
  total_amount: z.number().positive('Total amount must be positive').optional(),
  purchase_order: z.string().optional(),
  due_date: z.coerce.date().optional(),
  gst_number: z.string().optional(),
  tax_amount: z.number().nonnegative().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Mail = z.infer<typeof MailSchema>;

export type ProfileDocument = WithId<Profile>;
export type MailDocument = WithId<Mail>;