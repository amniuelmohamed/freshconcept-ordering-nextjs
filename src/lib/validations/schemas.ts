import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
}).optional();

export const clientCreationSchema = z.object({
  email: z.email(),
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  contactPhone: z.string().optional(),
  contactMobile: z.string().optional(),
  clientRoleId: z.uuid("Client role identifier must be a valid UUID."),
  remise: z.number().min(0).max(100),
  deliveryDays: z.array(z.string()).min(1),
  preferredLocale: z.enum(["fr", "nl", "en"]),
  tvaNumber: z.string().optional(),
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
  billingAddressDifferent: z.boolean().optional(),
});

export const employeeCreationSchema = z.object({
  email: z.email(),
  fullName: z.string().min(1),
  employeeRoleId: z.uuid("Employee role identifier must be a valid UUID."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ClientCreationInput = z.infer<typeof clientCreationSchema>;
export type EmployeeCreationInput = z.infer<typeof employeeCreationSchema>;

