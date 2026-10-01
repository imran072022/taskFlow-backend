import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { projectService } from "./project.service";
import type {
  TAddProjectMemberLocals,
  TCreateProjectLocals,
  TGetProjectIdLocals,
  TRemoveProjectMemberLocals,
  TUpdateProjectMemberRoleLocals,
} from "./project.type";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";

const createProject = catchAsync(
  async (req: Request, res: Response<unknown, TCreateProjectLocals>) => {
    const result = await projectService.createProject(
      req.user.id,
      res.locals.validatedData.body,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "Project created successfully",
      data: result,
    });
  },
);

const addProjectMember = catchAsync(
  async (req: Request, res: Response<unknown, TAddProjectMemberLocals>) => {
    const { memberId } = res.locals.validatedData.body;
    const { projectId } = res.locals.validatedData.params;
    const result = await projectService.addProjectMember(
      req.user.id,
      projectId,
      memberId,
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "Project member added successfully",
      data: result,
    });
  },
);

const getProjects = catchAsync(async (req: Request, res: Response) => {
  const result = await projectService.getProjects(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "Projects retrieved successfully",
    data: result,
  });
});
const getASingleProject = catchAsync(
  async (req: Request, res: Response<unknown, TGetProjectIdLocals>) => {
    const projectId = res.locals.validatedData.params.projectId;
    const result = await projectService.getASingleProject(
      req.user.id,
      projectId,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "Project retrieved successfully",
      data: result,
    });
  },
);

const getProjectMembers = catchAsync(
  async (req: Request, res: Response<unknown, TGetProjectIdLocals>) => {
    const projectId = res.locals.validatedData.params.projectId;

    const result = await projectService.getProjectMembers(
      req.user.id,
      projectId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Project members retrieved successfully",
      data: result,
    });
  },
);

const updateProjectMemberRole = catchAsync(
  async (req: Request, res: Response) => {
    const { projectId, memberId } = res.locals.validatedData.params;
    const { role } = res.locals.validatedData.body;

    const result = await projectService.updateProjectMemberRole(
      req.user.id,
      projectId,
      memberId,
      role,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: `Project member ${
        role === "MANAGER" ? "promoted to manager" : "demoted to member"
      } successfully`,
      data: result,
    });
  },
);

const removeProjectMember = catchAsync(
  async (req: Request, res: Response<unknown, TRemoveProjectMemberLocals>) => {
    const { projectId, memberId } = res.locals.validatedData.params;

    const result = await projectService.removeProjectMember(
      req.user.id,
      projectId,
      memberId,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Project member removed successfully",
      data: result,
    });
  },
);

export const projectController = {
  createProject,
  addProjectMember,
  getProjects,
  getASingleProject,
  getProjectMembers,
  updateProjectMemberRole,
  removeProjectMember,
};
