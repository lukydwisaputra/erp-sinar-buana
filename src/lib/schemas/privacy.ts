import { z } from "zod";

export const privacySettingsSchema = z.object({
  enabled: z.boolean(),
});
export type PrivacySettings = z.infer<typeof privacySettingsSchema>;
