import z from "zod";
import { OrganizationSize } from "../../../prisma/generated/prisma/enums";

export const createOrganizationSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(3, "Organization name must be at least 3 characters long")
        .max(30, "Organization name cannot exceed 30 characters"),

      description: z
        .string()
        .trim()
        .min(1, "Description cannot be empty")
        .max(500, "Description cannot exceed 500 characters"),

      industry: z
        .string()
        .trim()
        .min(1, "Industry cannot be empty")
        .max(100, "Industry cannot exceed 100 characters"),

      size: z.enum([
        OrganizationSize.SOLO,
        OrganizationSize.TWO_TO_TEN,
        OrganizationSize.ELEVEN_TO_FIFTY,
        OrganizationSize.FIFTY_ONE_TO_TWO_HUNDRED,
        OrganizationSize.TWO_HUNDRED_PLUS,
      ]),
      website: z.url("Invalid website URL").optional(),
    })
    .strict(),
});

export const inviteMemberSchema = z.object({
  body: z.object({
    inviteeId: z.string().trim(),
  }),
});

export const respondInvitationSchema = z.object({
  params: z.object({
    invitationId: z.string().trim(),
  }),
  body: z.object({
    status: z.string().trim(),
  }),
});

export const removeOrgMemberSchema = z.object({
  params: z.object({
    memberId: z.string(),
  }),
});
