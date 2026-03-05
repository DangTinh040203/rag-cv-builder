export class User {
  id: string;
  providerId: string;
  provider: string;
  email: string;

  firstName: string | null;
  lastName: string | null;
  avatar: string | null;

  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }

  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.firstName || this.lastName || '';
  }

  get isProfileComplete(): boolean {
    return !!(this.firstName && this.lastName && this.avatar);
  }
}
