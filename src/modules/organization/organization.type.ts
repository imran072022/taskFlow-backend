import type z from "zod";
import type {
  createOrganizationSchema,
  inviteMemberSchema,
  removeOrgMemberSchema,
  respondInvitationSchema,
} from "./organization.validation";

export type TCreateOrganization = z.infer<
  typeof createOrganizationSchema
>["body"];
export type TCreateOrganizationLocals = {
  validatedData: z.infer<typeof createOrganizationSchema>;
};

export type TInviteeId = z.infer<
  typeof inviteMemberSchema
>["body"]["inviteeId"];
export type TInviteeIdLocals = {
  validatedData: z.infer<typeof inviteMemberSchema>;
};

export type TInvitationId = z.infer<
  typeof respondInvitationSchema
>["params"]["invitationId"];
export type TInvitationStatus = z.infer<
  typeof respondInvitationSchema
>["body"]["status"];
export type TRespondInvitationLocals = {
  validatedData: z.infer<typeof respondInvitationSchema>;
};

export type TMemberId = z.infer<
  typeof removeOrgMemberSchema
>["params"]["memberId"];
export type TMemberIdLocals = {
  validatedData: z.infer<typeof removeOrgMemberSchema>;
};
