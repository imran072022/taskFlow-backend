import z from "zod";
import type {
  addProjectMemberSchema,
  createProjectSchema,
  getASingleProjectSchema,
  removeProjectMemberSchema,
  updateProjectMemberRoleSchema,
} from "./project.validation";

export type TCreateProject = z.infer<typeof createProjectSchema>["body"];
export type TCreateProjectLocals = {
  validatedData: z.infer<typeof createProjectSchema>;
};

export type TMemberId = z.infer<typeof addProjectMemberSchema>["body"];
export type TProjectId = z.infer<typeof addProjectMemberSchema>["params"];
export type TAddProjectMemberLocals = {
  validatedData: z.infer<typeof addProjectMemberSchema>;
};

export type TGetProjectId = z.infer<
  typeof getASingleProjectSchema
>["params"]["projectId"];
export type TGetProjectIdLocals = {
  validatedData: z.infer<typeof getASingleProjectSchema>;
};

export type TUpdateProjectMemberRole = z.infer<
  typeof updateProjectMemberRoleSchema
>;
export type TUpdateProjectMemberRoleLocals = {
  validatedData: z.infer<typeof updateProjectMemberRoleSchema>;
};

export type TRemoveProjectMember = z.infer<
  typeof removeProjectMemberSchema
>["params"];
export type TRemoveProjectMemberLocals = {
  validatedData: z.infer<typeof removeProjectMemberSchema>;
};
