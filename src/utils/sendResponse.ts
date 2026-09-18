import type { Response } from "express";

type TMeta = {
  page: number;
  limit: number;
  total: number;
};
interface TResponse<T> {
  statusCode: number;
  message: string;
  meta?: TMeta;
  data?: T;
}

const sendResponse = <T>(res: Response, responseData: TResponse<T>) => {
  const { statusCode, message, meta, data } = responseData;

  return res.status(statusCode).json({
    success: statusCode < 400,
    statusCode,
    message,
    meta,
    data,
  });
};
export default sendResponse;
