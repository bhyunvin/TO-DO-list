import { Injectable, Logger } from '@nestjs/common';
import { RequestAssistanceDto } from './assistance.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InternalServerErrorException } from '@nestjs/common';
import { decrypt } from '../utils/cryptUtil';
import { GeminiApiResponse } from './gemini.interface';
import { marked } from 'marked';
import * as sanitizeHtml from 'sanitize-html';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AssistanceService {
  private readonly logger = new Logger(AssistanceService.name);

  constructor(private readonly httpService: HttpService) {}

  async getGeminiResponse(
    requestAssistanceDto: RequestAssistanceDto,
  ): Promise<RequestAssistanceDto> {
    const apiKey = decrypt(process.env.GOOGLE_API_KEY);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    let systemPrompt = '';

    try {
      const promptPath =
        process.env.SYSTEM_PROMPT_PATH ||
        './src/assistance/assistance.systemPrompt.txt';
      systemPrompt = fs.readFileSync(path.resolve(promptPath), 'utf-8').trim();
    } catch (error) {
      this.logger.error('시스템 프롬프트를 불러오는 중 오류 발생:', error);
      systemPrompt = `[ROLE] 당신은 친절한 한국어 비서입니다. 존댓말로 할 일 목록에 관해서만 답변하세요.`;
    }

    const requestData = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          parts: [
            {
              text: requestAssistanceDto.prompt,
            },
          ],
        },
      ],
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<GeminiApiResponse>(apiUrl, requestData, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      const responseText = response.data.candidates[0].content.parts[0].text;
      const unsafeHtml = await marked.parse(responseText);
      const safeHtml = sanitizeHtml.default(unsafeHtml);
      requestAssistanceDto.response = safeHtml;
      return requestAssistanceDto;
    } catch (error) {
      this.logger.error(
        'Failed to get response from Gemini API',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException('AI Assistant API request failed');
    }
  }
}
