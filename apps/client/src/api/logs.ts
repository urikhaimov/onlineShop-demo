// src/api/logs.ts
export interface SecurityLog {
  id: string;
  timestamp: string; // ISO string datetime from API
  email?: string;
  uid?: string;
  type?: string;
  details?: string;
  collection?: string;
  affectedDocId?: string;

  // Optional: If your API uses other names for action/adminId, rename here or remove if unused
  action?: string;
  adminId?: string;
}
