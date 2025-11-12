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
import { CreateTodoDto } from '../todo/todo.dto';
import { UserEntity } from '../user/user.entity';

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

  private readonly createTodoTool = {
    functionDeclarations: [{
      name: 'createTodo',
      description: '사용자의 새로운 할 일을 생성합니다. 할 일 내용과 날짜는 필수입니다.',
      parameters: {
        type: 'OBJECT',
        properties: {
          todoContent: {
            type: 'STRING',
            description: '할 일의 내용 (필수). 사용자가 수행해야 할 작업을 명확하게 설명합니다.',
          },
          todoDate: {
            type: 'STRING',
            description: '할 일의 목표 날짜 (필수). YYYY-MM-DD 형식. 사용자가 날짜를 명시하지 않으면 오늘 날짜를 사용합니다.',
          },
          todoNote: {
            type: 'STRING',
            description: '할 일에 대한 추가 메모나 설명 (선택 사항).',
          },
        },
        required: ['todoContent', 'todoDate'],
      },
    }],
  };

  private readonly updateTodoTool = {
    functionDeclarations: [{
      name: 'updateTodo',
      description: '기존 할 일을 수정합니다. 할 일 ID는 필수이며, 수정할 필드만 포함합니다.',
      parameters: {
        type: 'OBJECT',
        properties: {
          todoSeq: {
            type: 'NUMBER',
            description: '수정할 할 일의 고유 ID (필수). 사용자가 참조한 할 일의 ID를 사용합니다.',
          },
          todoContent: {
            type: 'STRING',
            description: '수정할 할 일의 내용 (선택 사항).',
          },
          completeDtm: {
            type: 'STRING',
            description: '완료 일시 (선택 사항). 완료 처리 시 현재 시각의 ISO 8601 형식 문자열, 미완료 처리 시 null.',
          },
          todoNote: {
            type: 'STRING',
            description: '수정할 메모 내용 (선택 사항).',
          },
        },
        required: ['todoSeq'],
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
      tools: [this.getTodosTool, this.createTodoTool, this.updateTodoTool],
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

  /**
   * Creates a new TODO item for the user
   * @param userSeq - User sequence number identifying the user
   * @param ip - Client IP address for audit logging
   * @param todoContent - The content/description of the TODO item
   * @param todoDate - Target date for the TODO in YYYY-MM-DD format
   * @param todoNote - Optional additional notes for the TODO
   * @returns Structured response with success status and created TODO data
   */
  private async createTodo(
    userSeq: number,
    ip: string,
    todoContent: string,
    todoDate: string,
    todoNote?: string,
  ): Promise<any> {
    try {
      // Validate todoDate format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(todoDate)) {
        return {
          success: false,
          error: 'Invalid date format. Please use YYYY-MM-DD format (e.g., 2024-12-31)',
        };
      }

      // Construct user object (userId can be empty string for function calls)
      // Only userSeq is actually used by TodoService, but we need to satisfy the type
      const user = {
        userSeq,
        userId: '',
        userName: '',
        userEmail: '',
        userDescription: '',
        userProfileImageFileGroupNo: null,
        adminYn: 'N',
        auditColumns: null,
      } as Omit<UserEntity, 'userPassword'>;

      // Create DTO with TODO data
      const createTodoDto: CreateTodoDto = {
        todoContent,
        todoDate,
        todoNote,
      };

      // Call TodoService to create the TODO
      const createdTodo = await this.todoService.create(user, ip, createTodoDto);

      // Return structured success response
      return {
        success: true,
        data: {
          todoSeq: createdTodo.todoSeq,
          todoContent: createdTodo.todoContent,
          todoDate: createdTodo.todoDate,
          todoNote: createdTodo.todoNote,
          completeDtm: createdTodo.completeDtm,
          createdAt: createdTodo.auditColumns.regDtm.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to create TODO item', error);
      return {
        success: false,
        error: 'Failed to create TODO item. Please try again.',
      };
    }
  }
}
