// libs/mailer/src/transports/json.transport.ts
import nodemailer from 'nodemailer';
import type { MailTransport, MailMessage } from './mail-transport';

export class JsonTransport implements MailTransport {
  private transporter = nodemailer.createTransport({ jsonTransport: true });
  async send(msg: MailMessage) {
    const info = await this.transporter.sendMail({
      from: msg.replyTo || 'json@example.com',
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
