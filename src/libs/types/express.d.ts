import { type JwtPayload } from '@clerk/backend';

declare global {
  namespace Express {
    interface Request {
      auth: JwtPayload;
    }
  }
}
