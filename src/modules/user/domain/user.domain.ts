export interface User {
  id: string;
  providerId: string;
  provider: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;

  createdAt: Date;
  updatedAt: Date;
}
