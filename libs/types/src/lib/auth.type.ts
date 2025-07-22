import type { User } from 'firebase/auth';

export enum EUserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export interface IAuthPayload {
  uid: User['uid'];
  role: EUserRole;
}
