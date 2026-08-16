import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(160);
const passwordSchema = z.string().min(8).max(72).regex(/[A-Z]/, "Minimal satu huruf kapital").regex(/[0-9]/, "Minimal satu angka");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
  status: z.enum(["PENDING", "ACTIVE"]).default("ACTIVE"),
});

export const bookSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().nullable(),
  type: z.enum(["PERSONAL", "SHARED"]).default("PERSONAL"),
  currency: z.string().trim().length(3).toUpperCase().default("IDR"),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(50),
  icon: z.string().trim().max(40).default("WalletCards"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#64748b"),
  type: z.enum(["INCOME", "EXPENSE", "BOTH"]).default("BOTH"),
});

export const transactionSchema = z.object({
  amount: z.coerce.number().positive().max(999_999_999_999),
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().trim().max(240).optional().nullable(),
  date: z.string().datetime().or(z.string().date()),
  categoryId: z.string().cuid().optional().nullable(),
});

export const budgetSchema = z.object({
  name: z.string().trim().min(2).max(80),
  amount: z.coerce.number().positive().max(999_999_999_999),
  period: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  startDate: z.string().datetime().or(z.string().date()),
  endDate: z.string().datetime().or(z.string().date()),
  alertAt: z.coerce.number().int().min(1).max(100).default(80),
  categoryId: z.string().cuid().optional().nullable(),
}).refine((value) => new Date(value.endDate) >= new Date(value.startDate), {
  message: "Tanggal selesai harus setelah tanggal mulai.",
  path: ["endDate"],
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  avatarUrl: z
    .string()
    .max(900_000)
    .refine(
      (value) => value === "" || /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value),
      "Invalid avatar image.",
    )
    .optional()
    .nullable(),
});

export const financialPlanSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  targetAmount: z.coerce.number().positive().max(999_999_999_999),
  currentAmount: z.coerce.number().min(0).max(999_999_999_999).default(0),
  currency: z.string().trim().length(3).toUpperCase().default("IDR"),
  deadline: z.string().date().or(z.string().datetime()).optional().nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).default("ACTIVE"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export const pocketSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().nullable(),
  currency: z.string().trim().length(3).toUpperCase().default("IDR"),
  targetAmount: z.coerce.number().positive().max(999_999_999_999).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#10b981"),
  icon: z.enum(["Wallet", "Landmark", "PiggyBank", "ShieldCheck", "Plane", "Home"]).default("Wallet"),
  isArchived: z.boolean().default(false),
});

export const pocketEntrySchema = z.object({
  amount: z.coerce.number().positive().max(999_999_999_999),
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  note: z.string().trim().max(240).optional().nullable(),
  date: z.string().date().or(z.string().datetime()),
});

export const noteSchema = z.object({
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().max(10_000),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#64748b"),
  isPinned: z.boolean().default(false),
});
