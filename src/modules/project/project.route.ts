import { Router } from "express";
import { authentication } from "../../middlewares/authentication";
import { authorization } from "../../middlewares/authorization";
import {
  ProjectMemberRole,
  UserRole,
} from "../../../prisma/generated/prisma/enums";
import { validateRequest } from "../../middlewares/validateRequest";
import {
  addProjectMemberSchema,
  createProjectSchema,
  getASingleProjectSchema,
  removeProjectMemberSchema,
  updateProjectMemberRoleSchema,
} from "./project.validation";
import { projectController } from "./project.controller";
const router = Router();

router.post(
  "/create",
  authentication,
  authorization(UserRole.OWNER),
  validateRequest(createProjectSchema),
  projectController.createProject,
);

router.post(
  "/:projectId/members",
  authentication,
  authorization(UserRole.OWNER, UserRole.MEMBER),
  validateRequest(addProjectMemberSchema),
  projectController.addProjectMember,
);

router.get(
  "/",
  authentication,
  authorization(UserRole.OWNER, UserRole.MEMBER),
  projectController.getProjects,
);
router.get(
  "/:projectId",
  authentication,
  authorization(UserRole.OWNER, UserRole.MEMBER),
  validateRequest(getASingleProjectSchema),
  projectController.getASingleProject,
);
router.get(
  "/:projectId/members",
  authentication,
  authorization(UserRole.OWNER, UserRole.MEMBER),
  validateRequest(getASingleProjectSchema),
  projectController.getProjectMembers,
);

router.patch(
  "/:projectId/members/:memberId/role",
  authentication,
  authorization(UserRole.OWNER),
  validateRequest(updateProjectMemberRoleSchema),
  projectController.updateProjectMemberRole,
);

router.delete(
  "/:projectId/members/:memberId",
  authentication,
  validateRequest(removeProjectMemberSchema),
  authorization(UserRole.OWNER, UserRole.MEMBER),
  projectController.removeProjectMember,
);

export const projectRoutes = router;
