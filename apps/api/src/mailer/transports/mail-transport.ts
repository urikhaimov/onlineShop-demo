// libs/mailer/src/transports/mail-transport.ts
import type { MailerOptions, SendResult } from '../mailer.types';

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: MailerOptions['attachments'];
};

export interface MailTransport {
  send(msg: MailMessage): Promise<SendResult>;
}
