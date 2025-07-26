// src/constants/roles.ts

export const roles = ['user', 'admin', 'superadmin'] as const;

export type Role = (typeof roles)[number];

export const isValidRole = (role: unknown): role is Role =>
  typeof role === 'string' && roles.includes(role as Role);
