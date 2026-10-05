import jwt, { SignOptions } from "jsonwebtoken";

interface TokenPayload {
  id: string;
}

export const signToken = (payload: TokenPayload) =>
  jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "1d") as SignOptions["expiresIn"],
  });

export const verifyToken = (token: string) =>
  jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
