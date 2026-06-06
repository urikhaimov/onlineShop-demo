// src/services/ability.service.ts
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { EUserRole } from '@common/types';
import type { User } from 'firebase/auth';

// ✨ Drop this (it causes the runtime error):
// import { isAdmin } from '../context/AuthContext';

// ✅ Local, resilient admin check
const isAdmin = (role: EUserRole | string | null | undefined): boolean =>
  role === EUserRole.ADMIN || role === 'admin' || role === 'ADMIN';

export enum EAbilityActions {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
}

export enum EAbilitySubjects {
  HOME = 'home',
  LOGIN = 'login',
  PRODUCTS = 'products',
  PRODUCT = 'product',
  CATEGORIES = 'categories',
  CHECKOUT = 'checkout',
  CART = 'cart',
  ORDERS = 'orders',
  USERS = 'users',
  SETTINGS = 'settings',
  PROFILE = 'profile',
  RESET_PASSWORD = 'resetPassword',
  ALL = 'all',
}

export function defineAbilityFor({
  user,
  role,
}: {
  user: User | null;
  role: EUserRole | string | null;
}) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  if (user) {
    if (isAdmin(role)) {
      can([EAbilityActions.MANAGE], EAbilitySubjects.ALL);
    } else {
      can([EAbilityActions.MANAGE], user.uid);
      can([EAbilityActions.MANAGE], EAbilitySubjects.PROFILE);
      can([EAbilityActions.READ], EAbilitySubjects.HOME);
      can([EAbilityActions.MANAGE], EAbilitySubjects.PRODUCTS);
      can([EAbilityActions.MANAGE], EAbilitySubjects.ORDERS);
      can([EAbilityActions.READ], EAbilitySubjects.CART);
      can([EAbilityActions.READ], EAbilitySubjects.PRODUCT);
      can([EAbilityActions.MANAGE], EAbilitySubjects.CHECKOUT);
      can([EAbilityActions.MANAGE], EAbilitySubjects.RESET_PASSWORD);
    }
    cannot([EAbilityActions.READ], EAbilitySubjects.LOGIN);
  } else {
    can([EAbilityActions.READ], EAbilitySubjects.LOGIN);
  }

  can([EAbilityActions.READ], EAbilitySubjects.HOME);

  return build();
}
