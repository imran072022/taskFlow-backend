export type TErrorResponse = {
  statusCode: number;
  message: string;
  errors?: {
    field: string;
    message: string;
  }[];
};
