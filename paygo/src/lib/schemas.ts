import { z } from 'zod';
import { WithId } from 'mongodb';
import { config } from 'dotenv';
config().parsed;

export const ProfileSchema = z.object({
  uuid: z.string().uuid().optional(),
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
  scanned: z.array(z.string().uuid()).optional(),
});

export const MailSchema = z.object({
  uuid: z.string().uuid().optional(),
  user_uuid: z.string().uuid('Valid profile UUID required'),
  scraped_data: z.string().min(1, 'Scraped data required'),
  invoice_number: z.string().min(1, 'Invoice number required'),
  vendor_name: z.string().min(1, 'Vendor name required'),
  invoice_date: z.coerce.date(),
  total_amount: z.number().positive('Total amount must be positive'),
  purchase_order: z.string().optional(),
  due_date: z.coerce.date().optional(),
  gst_number: z.string().optional(),
  tax_amount: z.number().nonnegative().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Mail = z.infer<typeof MailSchema>;

export type ProfileDocument = WithId<Profile>;
export type MailDocument = WithId<Mail>;