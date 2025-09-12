// test/utils/test-mailer.ts
export const mailerMock = {
  sendOrderConfirmation: jest.fn(),
  sendRefundEmail: jest.fn(),
};
