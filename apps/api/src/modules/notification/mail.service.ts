// ============================================
// Mail Service — SMTP & Development Fallback
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<string>('SMTP_SECURE', 'false');

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: secure === 'true',
        auth: {
          user,
          pass,
        },
      });
      this.logger.log('SMTP Mail transporter initialized successfully');
    } else {
      this.logger.warn('SMTP configuration is missing. MailService running in development/fallback mode.');
    }
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    const from = this.configService.get<string>('SMTP_FROM', 'Maate Health <noreply@maate.health>');
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
        });
        this.logger.log(`Email sent successfully to ${to}`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${to}`, error);
      }
    } else {
      this.logger.log(
        `\n========================================` +
        `\n[Mail Fallback (Development Mode)]` +
        `\nFROM: ${from}` +
        `\nTO: ${to}` +
        `\nSUBJECT: ${subject}` +
        `\nCONTENT: ${text}` +
        `\n========================================`
      );
    }
  }
}
