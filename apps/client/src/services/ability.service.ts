import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { EUserRole } from '@common/types';
import type { User } from 'firebase/auth';
import { isAdmin } from '../context/AuthContext';

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
  CATEGORIES = 'categories',
  ORDERS = 'orders',
  USERS = 'users',
  SETTINGS = 'settings',
  PROFILE = 'profile',
  ALL = 'all',
}

export function defineAbilityFor({
  user,
  role,
}: {
  user: User | null;
  role: EUserRole | null;
}) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  if (user) {
    if (isAdmin(role as EUserRole)) {
      can([EAbilityActions.MANAGE], EAbilitySubjects.ALL);
    } else {
      can([EAbilityActions.MANAGE], user?.uid);
      can([EAbilityActions.READ], EAbilitySubjects.PROFILE);
      can([EAbilityActions.READ], EAbilitySubjects.HOME);
      can([EAbilityActions.MANAGE], EAbilitySubjects.PRODUCTS);
      can([EAbilityActions.READ], EAbilitySubjects.CATEGORIES);
      can([EAbilityActions.MANAGE], EAbilitySubjects.ORDERS);
      can([EAbilityActions.READ], EAbilitySubjects.USERS);
    }
    cannot([EAbilityActions.READ], EAbilitySubjects.LOGIN);
  } else {
    can([EAbilityActions.READ], EAbilitySubjects.LOGIN);
  }

  can([EAbilityActions.READ], EAbilitySubjects.HOME);

  return build();
}
