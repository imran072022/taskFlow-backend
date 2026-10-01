import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import httpStatus from "http-status";
import { organizationService } from "./organization.service";
import sendResponse from "../../utils/sendResponse";
import type {
  TCreateOrganizationLocals,
  TInviteeIdLocals,
  TMemberIdLocals,
  TRespondInvitationLocals,
} from "./organization.type";

const createOrganization = catchAsync(
  async (req: Request, res: Response<unknown, TCreateOrganizationLocals>) => {
    const result = await organizationService.createOrganization(
      res.locals.validatedData.body,
      req.user.id,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "Organization created successfully",
      data: result,
    });
  },
);

const getOrganizations = catchAsync(async (req: Request, res: Response) => {
  const result = await organizationService.getOrganizations(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "My organization has been retrieved successfully",
    data: result,
  });
});

const sendInvitation = catchAsync(
  async (req: Request, res: Response<unknown, TInviteeIdLocals>) => {
    const { inviteeId } = res.locals.validatedData.body;
    const result = await organizationService.sendInvitation(
      req.user.id,
      inviteeId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Invitation sent successfully",
      data: result,
    });
  },
);

const respondToInvitation = catchAsync(
  async (req: Request, res: Response<unknown, TRespondInvitationLocals>) => {
    const invitationId = res.locals.validatedData.params.invitationId;
    const status = res.locals.validatedData.body.status;

    const result = await organizationService.respondToInvitation(
      invitationId,
      status,
      req.user.id,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: `Invitation ${status.toLowerCase()} successfully`,
      data: result,
    });
  },
);

const getInvitations = catchAsync(async (req: Request, res) => {
  const result = await organizationService.getInvitations(req.user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Invitations retrieved successfully",
    data: result,
  });
});

const getOrganizationMembers = catchAsync(
  async (req: Request, res: Response) => {
    const result = await organizationService.getOrganizationMembers(
      req.user.id,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Organization members retrieved successfully",
      data: result,
    });
  },
);

const removeOrganizationMember = catchAsync(
  async (req: Request, res: Response<unknown, TMemberIdLocals>) => {
    const { memberId } = res.locals.validatedData.params;
    await organizationService.removeOrganizationMember(req.user.id, memberId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Organization member removed successfully",
      data: null,
    });
  },
);

export const organizationController = {
  createOrganization,
  getOrganizations,
  sendInvitation,
  respondToInvitation,
  getInvitations,
  getOrganizationMembers,
  removeOrganizationMember,
};
