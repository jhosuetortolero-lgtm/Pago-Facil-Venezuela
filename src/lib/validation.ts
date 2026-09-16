import { z } from "zod";

export const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Digite um e-mail válido."),
});
