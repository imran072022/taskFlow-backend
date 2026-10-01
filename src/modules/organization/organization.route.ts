import { Router } from "express";
import { authentication } from "../../middlewares/authentication";
import { authorization } from "../../middlewares/authorization";
import { UserRole } from "../../../prisma/generated/prisma/enums";
import { organizationController } from "./organization.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import {
  createOrganizationSchema,
  inviteMemberSchema,
  removeOrgMemberSchema,
  respondInvitationSchema,
} from "./organization.validation";

const router = Router();

router.post(
  "/create",
  authentication,
  authorization(UserRole.OWNER),
  validateRequest(createOrganizationSchema),
  organizationController.createOrganization,
);

router.get(
  "/",
  authentication,
  authorization(UserRole.OWNER),
  organizationController.getOrganizations,
);

router.post(
  "/invitations",
  authentication,
  authorization(UserRole.OWNER),
  validateRequest(inviteMemberSchema),
  organizationController.sendInvitation,
);

router.patch(
  "/invitations/:invitationId",
  authentication,
  authorization(UserRole.MEMBER),
  validateRequest(respondInvitationSchema),
  organizationController.respondToInvitation,
);

router.get(
  "/invitations",
  authentication,
  authorization(UserRole.OWNER, UserRole.MEMBER),
  organizationController.getInvitations,
);

router.get(
  "/members",
  authentication,
  authorization(UserRole.OWNER, UserRole.MEMBER, UserRole.ADMIN),
  organizationController.getOrganizationMembers,
);

router.delete(
  "/members/:memberId",
  authentication,
  authorization(UserRole.OWNER),
  validateRequest(removeOrgMemberSchema),
  organizationController.removeOrganizationMember,
);

export const organizationRoutes = router;
