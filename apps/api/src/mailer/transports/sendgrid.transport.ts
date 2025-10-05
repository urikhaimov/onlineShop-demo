// libs/mailer/src/transports/sendgrid.transport.ts
import sgMail from '@sendgrid/mail';
import type { MailTransport, MailMessage } from './mail-transport';
import type { MailerConfig } from '../mailer.types';

export class SendgridTransport implements MailTransport {
  constructor(private readonly cfg: MailerConfig) {
    sgMail.setApiKey(cfg.sendgrid!.apiKey);
  }
  async send(msg: MailMessage) {
    const [resp] = await sgMail.send({
      from: this.cfg.fromAddress,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      replyTo: msg.replyTo,
      attachments: (msg.attachments || []).map((a) => ({
        filename: a.filename,
        type: a.contentType || 'application/octet-stream',
        content: a.content.toString('base64'),
        disposition: 'attachment',
      })),
      mailSettings: this.cfg.sandbox
        ? { sandboxMode: { enable: true } }
        : undefined,
    });
    const id =
      (resp.headers['x-message-id'] as string) ||
      (resp.headers['x-message-id'.toLowerCase()] as string);
    return { ok: true, id };
  }
}
