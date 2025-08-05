export type TUserRole = 'admin' | 'user' | 'superadmin';
export interface IUser {
  id: string;
  email: string;
  role: TUserRole;
}
