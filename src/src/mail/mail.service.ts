import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ContactEmailDto } from './dto/contact-email.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Gmail 서비스 사용
      auth: {
        user: this.configService.get<string>('GMAIL_USER'),
        pass: this.configService.get<string>('GMAIL_APP_PASSWORD'),
      },
    });
  }

  async sendContactEmail(
    userEmail: string,
    contactData: ContactEmailDto,
    file?: Express.Multer.File,
  ): Promise<void> {
    const { title, content } = contactData;
    const developerEmail = this.configService.get<string>('GMAIL_USER');

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${userEmail}" <${developerEmail}>`, // 발신자 표시 (실제 발송은 인증된 계정)
      to: developerEmail, // 수신자: 개발자
      replyTo: userEmail, // 답장 시 사용자에게 가도록 설정
      subject: `[문의/제보] ${title}`,
      text: `
발신자: ${userEmail}

[문의 내용]
${content}
      `,
      // HTML 본문도 추가 가능
      html: `
        <h3>[문의/제보] ${title}</h3>
        <p><strong>발신자:</strong> ${userEmail}</p>
        <hr/>
        <p><strong>내용:</strong></p>
        <pre style="font-family: inherit; white-space: pre-wrap;">${content}</pre>
      `,
    };

    if (file) {
      mailOptions.attachments = [
        {
          filename: file.originalname,
          content: file.buffer,
        },
      ];
    }

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new InternalServerErrorException('메일 발송에 실패했습니다.');
    }
  }
}
