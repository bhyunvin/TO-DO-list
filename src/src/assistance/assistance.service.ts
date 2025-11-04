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
import { KeychainUtil } from '../utils/keychainUtil';
import { TodoService } from '../todo/todo.service';

@Injectable()
export class AssistanceService {
  private readonly logger = new Logger(AssistanceService.name);

  private readonly getTodosTool = {
    functionDeclarations: [{
      name: 'getTodos',
      description: '사용자의 할 일 목록을 DB에서 조회합니다.',
      parameters: {
        type: 'OBJECT',
        properties: {
          status: {
            type: 'STRING',
            description: "조회할 할 일의 상태. 'completed' (완료), 'incomplete' (미완료), 'overdue' (지연). 지정하지 않으면 모든 상태.",
          },
          days: {
            type: 'NUMBER',
            description: '조회할 기간(일). (예: 7은 지난 7일, -7은 향후 7일). 지정하지 않으면 전체 기간.',
          },
        },
      },
    }],
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly keychainUtil: KeychainUtil,
    private readonly todoService: TodoService,
  ) {}

  async getGeminiResponse(
    requestAssistanceDto: RequestAssistanceDto,
    userSeq?: number,
  ): Promise<RequestAssistanceDto> {
    const apiKey = await decrypt(
      await this.keychainUtil.getPassword('encrypt-google-api-key'),
    );
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
      tools: [this.getTodosTool],
    };

    try {
      // First API call to get initial response or function call request
      let response = await firstValueFrom(
        this.httpService.post<GeminiApiResponse>(apiUrl, requestData, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      const candidate = response.data.candidates[0];
      const firstPart = candidate.content.parts[0] as any;
      
      // Check if Gemini wants to call a function
      if (firstPart.functionCall) {
        const functionCall = firstPart.functionCall;
        
        if (functionCall.name === 'getTodos' && userSeq) {
          // Execute the getTodos function
          const args = functionCall.args || {};
          const todoData = await this.getTodos(userSeq, args.status, args.days);
          
          // Add function call and response to conversation
          requestData.contents.push({
            parts: [candidate.content.parts[0] as any],
          });
          
          requestData.contents.push({
            parts: [{
              functionResponse: {
                name: 'getTodos',
                response: {
                  content: todoData,
                },
              },
            } as any],
          });

          // Make second API call with function result
          response = await firstValueFrom(
            this.httpService.post<GeminiApiResponse>(apiUrl, requestData, {
              headers: {
                'Content-Type': 'application/json',
              },
            }),
          );
        }
      }

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

  private async getTodos(userSeq: number, status?: string, days?: number): Promise<any> {
    try {
      // Calculate date range based on days parameter
      let targetDate: string;
      const today = new Date();
      
      if (days !== undefined) {
        const targetDateObj = new Date(today);
        targetDateObj.setDate(today.getDate() + days);
        targetDate = targetDateObj.toISOString().split('T')[0];
      } else {
        targetDate = today.toISOString().split('T')[0];
      }

      // Get todos using existing TodoService method
      const todos = await this.todoService.findAll(userSeq, targetDate);
      
      // Filter todos based on status parameter
      let filteredTodos = todos;
      const currentDate = new Date();
      
      if (status) {
        filteredTodos = todos.filter(todo => {
          const todoDate = new Date(todo.todoDate);
          const isCompleted = todo.completeDtm !== null;
          const isOverdue = !isCompleted && todoDate < currentDate;
          
          switch (status) {
            case 'completed':
              return isCompleted;
            case 'incomplete':
              return !isCompleted && !isOverdue;
            case 'overdue':
              return isOverdue;
            default:
              return true;
          }
        });
      }

      // Return structured data suitable for AI context
      return {
        totalCount: filteredTodos.length,
        todos: filteredTodos.map(todo => ({
          todoSeq: todo.todoSeq,
          todoContent: todo.todoContent,
          todoDate: todo.todoDate,
          todoNote: todo.todoNote,
          completeDtm: todo.completeDtm,
          isCompleted: todo.completeDtm !== null,
          isOverdue: todo.completeDtm === null && new Date(todo.todoDate) < currentDate,
        })),
        queryParams: {
          status,
          days,
          targetDate,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get todos for AI query', error);
      throw new InternalServerErrorException('Failed to retrieve todo data');
    }
  }
}
