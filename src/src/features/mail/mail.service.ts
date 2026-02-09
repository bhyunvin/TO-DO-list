import * as nodemailer from 'nodemailer';

import { Logger } from '../../utils/logger';

export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger('MailService');

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // env.GMAIL_USER가 있으면 사용, 아니면 process.env
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  async sendContactEmail(
    userEmail: string,
    title: string,
    content: string,
    file?: File, // 웹 표준 File 객체
  ): Promise<void> {
    const developerEmail = process.env.GMAIL_USER;
    if (!developerEmail) throw new Error('GMAIL_USER config missing');

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${userEmail}" <${developerEmail}>`,
      to: developerEmail,
      replyTo: userEmail,
      subject: `[문의/제보] ${title}`,
      text: `
발신자: ${userEmail}

[문의 내용]
${content}
            `,
      html: `
                <h3>[문의/제보] ${title}</h3>
                <p><strong>발신자:</strong> ${userEmail}</p>
                <hr/>
                <p><strong>내용:</strong></p>
                <pre style="font-family: inherit; white-space: pre-wrap;">${content}</pre>
            `,
    };

    if (file) {
      // File -> Buffer 변환
      const arrayBuffer = await file.arrayBuffer();
      mailOptions.attachments = [
        {
          filename: file.name,
          content: Buffer.from(arrayBuffer),
        },
      ];
    }

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      this.logger.error('Email sending failed', String(error));
      throw new Error('메일 발송에 실패했습니다.');
    }
  }
}
