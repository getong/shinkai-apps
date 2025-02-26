import { z } from 'zod';

export const createJobFormSchema = z.object({
  agent: z.string().min(1),
  message: z.string().min(1),
  files: z.array(z.any()),
  tool: z
    .object({
      key: z.string().min(1),
      name: z.string().min(1),
      description: z.string().min(1),
      args: z.array(z.string()).optional(),
    })
    .optional(),
});

export type CreateJobFormSchema = z.infer<typeof createJobFormSchema>;
