export type CreateUserCommand = {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  avatar: string;
  provider: string;
  providerId: string;
};
