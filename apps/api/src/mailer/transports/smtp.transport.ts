// libs/mailer/src/transports/smtp.transport.ts
import nodemailer from 'nodemailer';
import type { MailTransport, MailMessage } from './mail-transport';
import type { MailerConfig } from '../mailer.types';

export class SmtpTransport implements MailTransport {
  private transporter = nodemailer.createTransport(
    this.cfg.smtp?.url
      ? { url: this.cfg.smtp.url, pool: true }
      : {
          host: this.cfg.smtp?.host,
          port: this.cfg.smtp?.port ?? 587,
          secure: !!this.cfg.smtp?.secure,
          auth: this.cfg.smtp?.user
            ? { user: this.cfg.smtp.user!, pass: this.cfg.smtp?.pass ?? '' }
            : undefined,
          pool: true,
        },
  );

  constructor(private readonly cfg: MailerConfig) {}

  async send(msg: MailMessage) {
    const info = await this.transporter.sendMail({
      from: this.cfg.fromAddress,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      replyTo: msg.replyTo,
      attachments: msg.attachments,
    });
    return { ok: true, id: info.messageId as string | undefined };
  }
}
