// JWT工具
import jwt, { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const signToken = (
  payload: any,
  expiresIn: string | number = "24h",
): string => {
  return jwt.sign(
    payload,
    JWT_SECRET as string,
    {
      expiresIn: expiresIn as string | number,
    } as SignOptions,
  );
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET as string);
  } catch (error) {
    return null;
  }
};

export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};
