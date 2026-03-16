import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Sends transactional emails at key registration lifecycle events.
 * In production replace SMTP transport with SES/Sendgrid SDK.
 */
@Injectable()
export class RegistrationNotificationsService {
  private readonly logger = new Logger(RegistrationNotificationsService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    this.fromAddress = this.config.get<string>('MAIL_FROM', 'noreply@portofbaku.az');

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: this.config.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  /** P1-03: OTP sent — handled by AuthService; this covers post-registration welcome */
  async sendIndividualWelcome(to: string, firstName: string) {
    await this.send(to, 'Account Created — Port of Baku EQP', `
      <p>Dear ${firstName},</p>
      <p>Your individual customer account has been created successfully.</p>
      <p>Please verify your contact and upload your identity document to complete registration.</p>
      <p>— Port of Baku E-Queue Platform</p>
    `);
  }

  /** P1-09: Legal entity submitted for review */
  async sendLegalSubmittedToApplicant(to: string, companyName: string) {
    await this.send(to, 'Registration Submitted for Review — Port of Baku EQP', `
      <p>Dear ${companyName},</p>
      <p>Your legal entity registration has been submitted for Finance review.</p>
      <p>Our Finance team will review your documents within <strong>1–2 business days</strong>.</p>
      <p>You will receive another notification once a decision has been made.</p>
      <p>— Port of Baku E-Queue Platform</p>
    `);
  }

  /** P1-F01: Notify Finance Officers of new pending registration */
  async sendFinanceOfficerAlert(financeEmail: string, companyName: string, applicantEmail: string) {
    await this.send(financeEmail, `New Registration Pending Review: ${companyName}`, `
      <p>A new legal entity registration requires your review.</p>
      <table>
        <tr><td><strong>Company:</strong></td><td>${companyName}</td></tr>
        <tr><td><strong>Applicant:</strong></td><td>${applicantEmail}</td></tr>
      </table>
      <p>Log in to the Finance portal to review and action this registration.</p>
      <p>— Port of Baku E-Queue Platform (automated)</p>
    `);
  }

  /** P1-F02: Notify applicant of Finance decision */
  async sendRegistrationDecision(
    to: string,
    companyName: string,
    approved: boolean,
    reason?: string,
  ) {
    const subject = approved
      ? 'Registration Approved — Port of Baku EQP'
      : 'Registration Rejected — Port of Baku EQP';

    const body = approved
      ? `
        <p>Dear ${companyName},</p>
        <p>🎉 Your legal entity registration has been <strong>approved</strong>.</p>
        <p>Your account is now active. You can sign in and start creating shipment orders.</p>
        <p>— Port of Baku E-Queue Platform</p>
      `
      : `
        <p>Dear ${companyName},</p>
        <p>We regret to inform you that your legal entity registration has been <strong>rejected</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>You may resubmit with corrections. Please note that a maximum of 2 review cycles are permitted.
        If you need assistance, please contact our support team.</p>
        <p>— Port of Baku E-Queue Platform</p>
      `;

    await this.send(to, subject, body);
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      // Non-fatal: log and continue — don't block the API response
      this.logger.error(`Failed to send email to ${to}`, err);
    }
  }
}
