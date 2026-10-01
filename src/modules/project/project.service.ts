import {
  ProjectMemberRole,
  TaskStatus,
} from "../../../prisma/generated/prisma/enums";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import type { TCreateProject, TGetProjectId } from "./project.type";
import httpStatus from "http-status";

const createProject = async (ownerId: string, payload: TCreateProject) => {
  const { name, description } = payload;
  const organization = await prisma.organization.findUnique({
    where: {
      ownerId,
    },
    select: {
      id: true,
    },
  });

  if (!organization) {
    throw new AppError(httpStatus.NOT_FOUND, "Organization not found");
  }

  return prisma.project.create({
    data: {
      organizationId: organization.id,
      name,
      description,
    },
  });
};

const addProjectMember = async (
  requesterId: string,
  projectId: string,
  memberId: string,
) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      organizationId: true,
      organization: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  const isOwner = project.organization.ownerId === requesterId;

  if (!isOwner) {
    const requesterMembership = await prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: requesterId,
        },
      },
      select: {
        role: true,
      },
    });

    if (
      !requesterMembership ||
      requesterMembership.role !== ProjectMemberRole.MANAGER
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Only the organization owner or project manager can add members",
      );
    }
  }

  const organizationMembership = await prisma.organizationMembership.findUnique(
    {
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId: memberId,
        },
      },
    },
  );

  if (!organizationMembership) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "User does not belong to this organization",
    );
  }

  const existingMembership = await prisma.projectMembership.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: memberId,
      },
    },
  });

  if (existingMembership) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User is already a member of this project",
    );
  }

  return prisma.projectMembership.create({
    data: {
      projectId,
      userId: memberId,
    },
  });
};

const getProjects = async (userId: string) => {
  const organization = await prisma.organization.findUnique({
    where: {
      ownerId: userId,
    },
    select: {
      id: true,
    },
  });

  if (organization) {
    return prisma.project.findMany({
      where: {
        organizationId: organization.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  const memberships = await prisma.projectMembership.findMany({
    where: {
      userId,
    },
    include: {
      project: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return memberships.map(({ project }) => project);
};

const getASingleProject = async (userId: string, projectId: TGetProjectId) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      organization: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  const isOwner = project.organization.ownerId === userId;

  if (!isOwner) {
    const membership = await prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not have access to this project",
      );
    }
  }

  const [
    totalMembers,
    totalTasks,
    assignedTasks,
    unassignedTasks,
    completedTasks,
    todoTasks,
    inProgressTasks,
    overdueTasks,
  ] = await Promise.all([
    prisma.projectMembership.count({
      where: { projectId },
    }),

    prisma.task.count({
      where: { projectId },
    }),

    prisma.task.count({
      where: {
        projectId,
        assigneeId: { not: null },
      },
    }),

    prisma.task.count({
      where: {
        projectId,
        assigneeId: null,
      },
    }),

    prisma.task.count({
      where: {
        projectId,
        status: TaskStatus.COMPLETED,
      },
    }),

    prisma.task.count({
      where: {
        projectId,
        status: TaskStatus.TODO,
      },
    }),

    prisma.task.count({
      where: {
        projectId,
        status: TaskStatus.IN_PROGRESS,
      },
    }),

    prisma.task.count({
      where: {
        projectId,
        status: TaskStatus.OVERDUE,
      },
    }),
  ]);

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    organization: project.organization,
    analytics: {
      totalMembers,
      totalTasks,
      assignedTasks,
      unassignedTasks,
      completedTasks,
      todoTasks,
      inProgressTasks,
      overdueTasks,
    },
  };
};

const getProjectMembers = async (userId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      organization: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  const isOwner = project.organization.ownerId === userId;

  if (!isOwner) {
    const membership = await prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not have access to this project",
      );
    }
  }

  return prisma.projectMembership.findMany({
    where: {
      projectId,
    },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

const updateProjectMemberRole = async (
  ownerId: string,
  projectId: string,
  memberId: string,
  role: ProjectMemberRole,
) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      organization: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  if (project.organization.ownerId !== ownerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only the organization owner can change project member roles",
    );
  }

  const membership = await prisma.projectMembership.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: memberId,
      },
    },
  });

  if (!membership) {
    throw new AppError(httpStatus.NOT_FOUND, "Project member not found");
  }
  if (membership.role === role) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Project member is already a ${role.toLowerCase()}`,
    );
  }
  return prisma.projectMembership.update({
    where: {
      projectId_userId: {
        projectId,
        userId: memberId,
      },
    },
    data: {
      role,
    },
  });
};

const removeProjectMember = async (
  requesterId: string,
  projectId: string,
  memberId: string,
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      organization: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  const requesterMembership = await prisma.projectMembership.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: requesterId,
      },
    },
    select: {
      role: true,
    },
  });

  const isOwner = project.organization.ownerId === requesterId;
  const isManager = requesterMembership?.role === ProjectMemberRole.MANAGER;

  if (!isOwner && !isManager) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to remove project members",
    );
  }

  const targetMembership = await prisma.projectMembership.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: memberId,
      },
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!targetMembership) {
    throw new AppError(httpStatus.NOT_FOUND, "Project member not found");
  }

  if (isManager && targetMembership.role === ProjectMemberRole.MANAGER) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "A manager cannot remove another manager",
    );
  }

  const [, result] = await prisma.$transaction([
    prisma.task.updateMany({
      where: {
        projectId,
        assigneeId: memberId,
      },
      data: {
        assigneeId: null,
      },
    }),
    prisma.projectMembership.delete({
      where: {
        id: targetMembership.id,
      },
    }),
  ]);

  return result;
};

export const projectService = {
  createProject,
  addProjectMember,
  getProjects,
  getASingleProject,
  getProjectMembers,
  updateProjectMemberRole,
  removeProjectMember,
};
