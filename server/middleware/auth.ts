import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../db";
import type { AuthenticatedRequest, AuthUser } from "../types";

export const AUTH_COOKIE = "cattwin_session";

export function issueAuthCookie(res: Response, user: AuthUser) {
  const token = jwt.sign(user, config.jwtSecret, { expiresIn: `${config.jwtDays}d` });
  res.cookie(AUTH_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: config.jwtDays * 86_400_000, path: "/" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return res.status(401).json({ error: "Please sign in to continue." });
  try {
    (req as AuthenticatedRequest).user = jwt.verify(token, config.jwtSecret) as AuthUser;
    next();
  } catch {
    res.clearCookie(AUTH_COOKIE, { path: "/" });
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}

export async function requireCatOwner(req: Request, res: Response, next: NextFunction) {
  const userId = (req as AuthenticatedRequest).user.id;
  const rawCatId = req.params.catId;
  const catId = Array.isArray(rawCatId) ? rawCatId[0] : rawCatId;
  const cat = await prisma.cat.findFirst({ where: { id: catId, userId }, select: { id: true } });
  if (!cat) return res.status(404).json({ error: "Cat not found." });
  next();
}
