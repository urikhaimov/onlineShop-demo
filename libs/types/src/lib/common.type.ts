export interface ITimestamp {
  createdAt: Date;
  updatedAt: Date;
}

export interface IMetadata extends ITimestamp {
  createdBy?: { uid: string; name: string };
  updatedBy?: { uid: string; name: string };
}
