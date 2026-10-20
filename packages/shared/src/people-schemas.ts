import { z } from "zod";

export const PERSON_ROLES = ["member", "viewer"] as const;
export const IM_CHANNELS = ["feishu", "dingtalk", "wecom"] as const;
export const personRoleSchema = z.enum(PERSON_ROLES);
export const imChannelSchema = z.enum(IM_CHANNELS);
export type PersonRole = z.infer<typeof personRoleSchema>;
export type ImChannel = z.infer<typeof imChannelSchema>;
export const createPersonSchema = z.object({
  name: z.string().trim().min(1).max(20),
  role: personRoleSchema,
});
export const patchPersonSchema = createPersonSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, "Provide at least one field");
export const personBindingSchema = z.object({
  id: z.string(),
  personId: z.string(),
  channel: imChannelSchema,
  externalId: z.string(),
  displayName: z.string(),
  createdAt: z.iso.datetime(),
});
export const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: personRoleSchema,
  createdAt: z.iso.datetime(),
  bindings: z.array(personBindingSchema),
});
export const bindCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  expiresAt: z.iso.datetime(),
});
export type Person = z.infer<typeof personSchema>;
export type PersonBinding = z.infer<typeof personBindingSchema>;
