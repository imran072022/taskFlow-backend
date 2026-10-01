import z from "zod";
import { ProjectMemberRole } from "../../../prisma/generated/prisma/enums";

export const createProjectSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(3, "Project name must be at least 3 characters long")
      .max(30, "Organization name cannot exceed 30 characters"),

    description: z
      .string()
      .trim()
      .min(1, "Description cannot be empty")
      .max(500, "Description cannot exceed 500 characters"),
  }),
});

export const addProjectMemberSchema = z.object({
  body: z.object({
    memberId: z.string().trim(),
  }),
  params: z.object({
    projectId: z.string().trim(),
  }),
});

export const getASingleProjectSchema = z.object({
  params: z.object({
    projectId: z.string().trim(),
  }),
});

export const updateProjectMemberRoleSchema = z.object({
  params: z.object({
    projectId: z.string().trim(),
    memberId: z.string().trim(),
  }),
  body: z.object({
    role: z.enum([ProjectMemberRole.MANAGER, ProjectMemberRole.MEMBER]),
  }),
});

export const removeProjectMemberSchema = z.object({
  params: z.object({
    projectId: z.string().trim(),
    memberId: z.string().trim(),
  }),
});
