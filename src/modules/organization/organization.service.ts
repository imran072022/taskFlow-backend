import {
  InvitationStatus,
  UserRole,
} from "../../../prisma/generated/prisma/enums";
import { AppError } from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import type {
  TCreateOrganization,
  TInvitationId,
  TInvitationStatus,
  TInviteeId,
  TMemberId,
} from "./organization.type";
import httpStatus from "http-status";

const createOrganization = async (
  payload: TCreateOrganization,
  userId: string,
) => {
  const { name, description, industry, size, website } = payload;
  const result = await prisma.organization.create({
    data: {
      name,
      description,
      industry,
      size,
      ...(website !== undefined && { website }),
      ownerId: userId,
    },
  });
  return result;
};

const getOrganizations = async (userId: string) => {
  const myOrganization = prisma.organization.findUnique({
    where: {
      ownerId: userId,
    },
  });
  return myOrganization;
};

const sendInvitation = async (inviterId: string, inviteeId: string) => {
  const organization = await prisma.organization.findUnique({
    where: {
      ownerId: inviterId,
    },
  });

  if (!organization) {
    throw new AppError(httpStatus.NOT_FOUND, "Organization not found");
  }
  if (inviterId === inviteeId) {
    throw new AppError(httpStatus.BAD_REQUEST, "You cannot invite yourself");
  }

  const invitee = await prisma.user.findUnique({
    where: {
      id: inviteeId,
    },
  });

  if (!invitee) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const existingMembership = await prisma.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: inviteeId,
      },
    },
  });

  if (existingMembership) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User is already a member of this organization",
    );
  }

  const existingInvitation = await prisma.organizationInvitation.findFirst({
    where: {
      organizationId: organization.id,
      inviteeId,
      status: InvitationStatus.REQUESTED,
    },
  });

  if (existingInvitation) {
    throw new AppError(
      httpStatus.CONFLICT,
      "An invitation has already been sent to this user",
    );
  }

  return prisma.organizationInvitation.create({
    data: {
      organizationId: organization.id,
      inviterId,
      inviteeId,
      status: InvitationStatus.REQUESTED,
    },
  });
};

const respondToInvitation = async (
  invitationId: TInvitationId,
  status: TInvitationStatus,
  userId: string,
) => {
  const invitation = await prisma.organizationInvitation.findUnique({
    where: {
      id: invitationId,
    },
  });

  if (!invitation) {
    throw new AppError(httpStatus.NOT_FOUND, "Invitation not found");
  }

  if (invitation.inviteeId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to respond to this invitation",
    );
  }

  if (invitation.status !== InvitationStatus.REQUESTED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This invitation has already been responded to",
    );
  }

  if (
    status !== InvitationStatus.ACCEPTED &&
    status !== InvitationStatus.REJECTED
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invitation can only be accepted or rejected",
    );
  }

  if (status === InvitationStatus.REJECTED) {
    return prisma.organizationInvitation.update({
      where: {
        id: invitationId,
      },
      data: {
        status: InvitationStatus.REJECTED,
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    await tx.organizationMembership.create({
      data: {
        organizationId: invitation.organizationId,
        userId: invitation.inviteeId,
      },
    });

    return tx.organizationInvitation.update({
      where: {
        id: invitationId,
      },
      data: {
        status: InvitationStatus.ACCEPTED,
      },
    });
  });
};

const getInvitations = async (userId: string) => {
  const invitations = await prisma.organizationInvitation.findMany({
    where: {
      status: InvitationStatus.REQUESTED,
      OR: [{ inviterId: userId }, { inviteeId: userId }],
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      invitee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    count: invitations.length,
    invitations,
  };
};

const getOrganizationMembers = async (userId: string) => {
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId,
    },
    select: {
      organizationId: true,
    },
  });

  if (!membership) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "You do not belong to any organization",
    );
  }

  const members = await prisma.organizationMembership.findMany({
    where: {
      organizationId: membership.organizationId,
    },
    include: {
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
  return { count: members.length, members };
};

const removeOrganizationMember = async (
  ownerId: string,
  memberId: TMemberId,
) => {
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

  if (ownerId === memberId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You cannot remove yourself from the organization",
    );
  }

  const membership = await prisma.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: memberId,
      },
    },
  });

  if (!membership) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Member not found in this organization",
    );
  }

  return prisma.organizationMembership.delete({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: memberId,
      },
    },
  });
};

export const organizationService = {
  createOrganization,
  getOrganizations,
  sendInvitation,
  respondToInvitation,
  getInvitations,
  getOrganizationMembers,
  removeOrganizationMember,
};
