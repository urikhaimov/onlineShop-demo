export const adminDb = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  runTransaction: jest.fn(async (fn) => {
    const tx = {
      get: jest.fn(async () => ({ exists: false, get: () => null })),
      set: jest.fn(),
      update: jest.fn(),
    };
    await fn(tx);
    return true;
  }),
};
