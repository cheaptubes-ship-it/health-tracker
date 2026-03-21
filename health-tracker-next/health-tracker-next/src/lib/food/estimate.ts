import { z } from 'zod'

export const MacroEstimateSchema = z.object({
  name: z.string().min(1).describe('Short label for the meal/food item'),
  calories: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
})

export type MacroEstimate = z.infer<typeof MacroEstimateSchema>
