import type { NextFunction, Request, Response } from "express";

export class ApiError extends Error { constructor(public readonly status: number, message: string) { super(message); } }
export function asyncRoute<T extends Request>(handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => { Promise.resolve(handler(req as T, res, next)).catch(next); };
}
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ApiError) return res.status(error.status).json({ error: error.message });
  console.error(error);
  return res.status(500).json({ error: "Something went wrong. Please try again." });
}
