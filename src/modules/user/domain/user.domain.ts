export interface User {
  id: string;
  providerId: string;
  provider: string;
  email: string;

  firstName: string | null;
  lastName: string | null;
  avatar: string | null;

  createdAt: Date;
  updatedAt: Date;
}
