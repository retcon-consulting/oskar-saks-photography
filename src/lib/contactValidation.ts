import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(120),
  email: z.email("Please enter a valid email address.").max(200),
  // Optional; any common way of writing a number, as long as it has a plausible number of digits.
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[\d\s()+.\-]*$/, "Please enter a valid phone number.")
    .refine((value) => value === "" || (value.replace(/\D/g, "").length >= 7 && value.replace(/\D/g, "").length <= 15), "Please enter a valid phone number.")
    .optional(),
  // Topics follow the editable services list, so the route checks membership against the current one.
  topic: z.string().trim().min(1).max(60),
  // A day picked in the form's date field (YYYY-MM-DD), or nothing.
  date: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Please pick a valid date.")
    .optional(),
  message: z.string().trim().min(10, "Tell Oskar a little more (10+ characters).").max(4000),
});

export type ContactInput = z.infer<typeof contactSchema>;
