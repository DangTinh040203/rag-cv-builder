export enum ClerkUserWebhook {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
}

export interface ClerkUserCreatedEvent {
  id: string;
  object: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string;
  image_url: string;
  has_image: boolean;
  primary_email_address_id: string | null;
  primary_phone_number_id: string | null;
  primary_web3_wallet_id: string | null;
  password_enabled: boolean;
  two_factor_enabled: boolean;
  totp_enabled: boolean;
  backup_code_enabled: boolean;
  email_addresses: {
    id: string;
    email_address: string;
    verification: {
      status: string;
      strategy: string;
    } | null;
    linked_to: Array<{
      type: string;
      id: string;
    }>;
  }[];
  banned: boolean;
  locked: boolean;
  lockout_expires_in_seconds: number | null;
  verification_attempts_remaining: number;
  created_at: number;
  updated_at: number;
  last_active_at: number | null;
}

export interface ClerkWebhook {
  data: ClerkUserCreatedEvent;
  instance_id: string;
  object: string;
  timestamp: number;
  type: ClerkUserWebhook;
}
