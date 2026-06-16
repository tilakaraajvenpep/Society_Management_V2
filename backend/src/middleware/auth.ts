import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { masterPrisma, tenantStorage } from "../utils/prisma";

interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = decoded;

    if (decoded.tenantId) {
      const tenant = await masterPrisma.tenant.findUnique({ where: { id: decoded.tenantId } });
      if (tenant) {
        return tenantStorage.run({ tenantSlug: tenant.slug }, () => {
          next();
        });
      }
    }
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};
