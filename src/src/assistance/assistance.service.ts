import { Injectable, Logger } from '@nestjs/common';
import { RequestAssistanceDto } from './assistance.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InternalServerErrorException } from '@nestjs/common';
import { decrypt } from '../utils/cryptUtil';
import { GeminiApiResponse } from './gemini.interface';

@Injectable()
export class AssistanceService {
  private readonly logger = new Logger(AssistanceService.name);

  constructor(
    private readonly httpService: HttpService,
  ) {}

  async getGeminiResponse(requestAssistanceDto: RequestAssistanceDto): Promise<RequestAssistanceDto> {
    const apiKey = decrypt(process.env.GOOGLE_API_KEY);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // curl의 -d 부분에 해당하는 요청 본문
    const requestData = {
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
      requestAssistanceDto.response = responseText;
      return requestAssistanceDto;
    } catch (error) {
      this.logger.error('Failed to get response from Gemini API', error.response?.data || error.message);
      throw new InternalServerErrorException('AI Assistant API request failed');
    }
  }
}
