import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { RequestAssistanceDto } from './assistance.dto';
import { GoogleGenAI, Type, Content, Part } from '@google/genai';
import { marked } from 'marked';
import * as sanitizeHtml from 'sanitize-html';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TodoService } from '../todo/todo.service';
import { UserEntity } from '../user/user.entity';
import { ConfigService } from '@nestjs/config';
import { decryptSymmetric } from '../utils/cryptUtil';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AssistanceService implements OnModuleInit {
  private readonly logger = new Logger(AssistanceService.name);

  // Tool Definitions using SDK types
  private readonly tools = [
    {
      functionDeclarations: [
        {
          name: 'getTodos',
          description: '사용자의 할 일 목록을 DB에서 조회합니다.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              status: {
                type: Type.STRING,
                description:
                  "조회할 할 일의 상태. 'completed' (완료), 'incomplete' (미완료), 'overdue' (지연). 지정하지 않으면 모든 상태.",
              },
              days: {
                type: Type.NUMBER,
                description:
                  '조회할 기간(일). (예: 7은 지난 7일, -7은 향후 7일). 지정하지 않으면 전체 기간.',
              },
            },
          },
        },
        {
          name: 'createTodo',
          description:
            '사용자의 새로운 할 일을 생성합니다. 할 일 내용과 날짜는 필수입니다.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              todoContent: {
                type: Type.STRING,
                description:
                  '할 일의 내용 (필수). 사용자가 수행해야 할 작업을 명확하게 설명합니다.',
              },
              todoDate: {
                type: Type.STRING,
                description:
                  '할 일의 목표 날짜 (필수). YYYY-MM-DD 형식. 사용자가 날짜를 명시하지 않으면 오늘 날짜를 사용합니다.',
              },
              todoNote: {
                type: Type.STRING,
                description: '할 일에 대한 추가 메모나 설명 (선택 사항).',
              },
            },
            required: ['todoContent', 'todoDate'],
          },
        },
        {
          name: 'updateTodo',
          description:
            '기존 할 일을 수정합니다. todoSeq 또는 todoContentToFind로 식별할 수 있습니다.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              todoSeq: {
                type: Type.NUMBER,
                description:
                  '수정할 할 일의 고유 ID (선택 사항 - todoContentToFind가 제공되지 않은 경우 필수).',
              },
              todoContentToFind: {
                type: Type.STRING,
                description:
                  '수정할 할 일을 찾기 위한 내용 검색어 (선택 사항 - todoSeq가 제공되지 않은 경우 필수).',
              },
              todoContent: {
                type: Type.STRING,
                description: '수정할 할 일의 새로운 내용 (선택 사항).',
              },
              isCompleted: {
                type: Type.BOOLEAN,
                description:
                  '완료 상태 (선택 사항). true로 설정하면 작업을 완료로 표시하고, false로 설정하면 미완료로 표시합니다.',
              },
              todoNote: {
                type: Type.STRING,
                description: '수정할 메모 내용 (선택 사항).',
              },
            },
          },
        },
      ],
    },
  ];

  constructor(
    private readonly todoService: TodoService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async onModuleInit() {
    this.logger.log('AssistanceService 모듈 초기화 완료');
  }

  /**
   * Gemini API 응답 가져오기 (SDK 사용)
   */
  async getGeminiResponse(
    requestAssistanceDto: RequestAssistanceDto,
    userSeq?: number,
    ip?: string,
    userName?: string,
    userId?: string,
  ): Promise<RequestAssistanceDto> {
    const apiKey = await this.validateAndGetApiKey(userSeq);
    const systemPrompt = this.loadSystemPrompt(userName);

    const ai = new GoogleGenAI({ apiKey });

    // Convert DTO history to SDK Content type
    // Use 'any' or safe casting to bridge the types if strictly incompatible
    const contents: Content[] = (requestAssistanceDto.history || []).map(
      (h) => ({
        role: h.role,
        parts: h.parts.map((p) => ({ text: p.text })),
      }),
    );

    contents.push({
      role: 'user',
      parts: [{ text: requestAssistanceDto.prompt }],
    });

    const maxTurns = 5;
    let turn = 0;

    try {
      while (turn < maxTurns) {
        const thinkingConfig = {
          thinkingLevel: 'HIGH' as any,
        };

        this.logger.log(
          `[Gemini SDK] Generating content (Turn ${turn + 1})...`,
        );

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: contents,
          config: {
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            tools: this.tools,
            thinkingConfig,
          },
        });

        const candidate = response?.candidates?.[0];
        if (!candidate) throw new Error('No candidate returned');

        const content = candidate.content;
        const parts = content?.parts || [];

        contents.push(content);

        const functionCalls = parts.filter((p) => p.functionCall);

        if (functionCalls.length > 0) {
          this.logger.log(
            `[Gemini SDK] Function calls detected: ${functionCalls.length}`,
          );

          const functionResponses = await Promise.all(
            functionCalls.map(async (part) => {
              const call = part.functionCall;
              const result = await this.executeFunctionCall(
                call,
                userSeq,
                userId,
                ip,
              );

              return {
                functionResponse: {
                  name: call.name,
                  response: { content: result },
                },
              };
            }),
          );

          // 'function' role is standard for responses in Gemini
          contents.push({
            role: 'function',
            parts: functionResponses as Part[],
          } as Content);

          turn++;
          continue;
        }

        const textPart = parts.find((p) => p.text);
        const responseText = textPart ? textPart.text : '';

        if (!responseText && functionCalls.length === 0) {
          this.logger.warn('[Gemini SDK] Empty response received');
        }

        const safeHtml = await this.processFinalResponse(responseText);
        requestAssistanceDto.response = safeHtml;

        return requestAssistanceDto;
      }

      throw new InternalServerErrorException(
        'Max turns reached for function calling',
      );
    } catch (error) {
      this.handleGeminiError(error);
    }
  }

  private async validateAndGetApiKey(userSeq?: number): Promise<string> {
    if (!userSeq) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    const user = await this.userRepository.findOne({ where: { userSeq } });
    if (!user?.aiApiKey) {
      throw new BadRequestException(
        'AI API Key가 설정되지 않았습니다. 프로필 설정에서 등록해주세요.',
      );
    }
    const apiKey = decryptSymmetric(user.aiApiKey);
    if (!apiKey) {
      throw new InternalServerErrorException(
        'API Key 처리 중 오류가 발생했습니다.',
      );
    }
    return apiKey;
  }

  private async processFinalResponse(text: string = ''): Promise<string> {
    const unsafeHtml = await marked.parse(text);
    return sanitizeHtml.default(unsafeHtml);
  }

  private handleGeminiError(error: any) {
    this.logger.error('Gemini API Error', error);
    throw new InternalServerErrorException('AI Assistant request failed');
  }

  private loadSystemPrompt(userName?: string): string {
    let systemPrompt = '';
    try {
      const promptPath =
        process.env.SYSTEM_PROMPT_PATH ||
        './src/assistance/assistance.systemPrompt.txt';
      systemPrompt = fs.readFileSync(path.resolve(promptPath), 'utf-8').trim();
      if (userName) {
        systemPrompt = systemPrompt.replaceAll('[사용자 이름]', userName);
      }
      const currentDate = this.getCurrentKSTDate();
      systemPrompt += `\n\n[CURRENT_DATE]\n오늘 날짜: ${currentDate} (YYYY-MM-DD 형식)\n이 날짜를 기준으로 "오늘", "내일", "다음 주" 등의 상대적 날짜를 계산하세요.`;
    } catch (error) {
      this.logger.error('시스템 프롬프트를 불러오는 중 오류 발생:', error);
      systemPrompt = `[ROLE] 당신은 친절한 한국어 비서입니다. 존댓말로 할 일 목록에 관해서만 답변하세요.`;
    }
    return systemPrompt;
  }

  private getCurrentKSTDate(): string {
    const now = new Date();
    const kstOffset = 9 * 60;
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
    return kstTime.toISOString().split('T')[0];
  }

  // --- Function Implementations ---

  private async executeFunctionCall(
    functionCall: any,
    userSeq: number,
    userId: string,
    ip: string,
  ): Promise<any> {
    const args = functionCall.args || {};
    this.logger.debug(
      `[Exec] Function: ${functionCall.name}, Args: ${JSON.stringify(args)}`,
    );

    // Using map for cleaner dispatch
    const handlers: Record<string, () => Promise<any>> = {
      getTodos: () => this.getTodos(userSeq, args.status, args.days),
      createTodo: () =>
        this.createTodo(
          userSeq,
          userId,
          ip,
          args.todoContent,
          args.todoDate,
          args.todoNote,
        ),
      updateTodo: () =>
        this.updateTodo(
          userSeq,
          userId,
          ip,
          args.todoSeq,
          args.todoContentToFind,
          {
            todoContent: args.todoContent,
            isCompleted: args.isCompleted,
            todoNote: args.todoNote,
          },
        ),
    };

    const handler = handlers[functionCall.name];
    if (handler) {
      return await handler();
    } else {
      this.logger.warn(`Unknown function: ${functionCall.name}`);
      return { error: `Unknown function ${functionCall.name}` };
    }
  }

  private async findTodoByContent(
    userSeq: number,
    contentToFind: string,
  ): Promise<{
    success: boolean;
    todoSeq?: number;
    matches?: number;
    error?: string;
  }> {
    try {
      const matches = await this.todoService.search(userSeq, contentToFind);
      if (matches.length === 0)
        return { success: false, error: '일치하는 할 일을 찾을 수 없습니다.' };
      if (matches.length === 1)
        return { success: true, todoSeq: matches[0].todoSeq };

      const incompleteMatches = matches.filter(
        (todo) => todo.completeDtm === null,
      );
      if (incompleteMatches.length === 1)
        return { success: true, todoSeq: incompleteMatches[0].todoSeq };

      return {
        success: false,
        matches: matches.length,
        error: `"${contentToFind}"와 일치하는 할 일이 ${matches.length}개 있습니다. (미완료: ${incompleteMatches.length}개). 더 구체적으로 지정해주세요.`,
      };
    } catch (error) {
      this.logger.error('[findTodoByContent] Error', error);
      return { success: false, error: '할 일 검색에 실패했습니다.' };
    }
  }

  private async getTodos(
    userSeq: number,
    status?: string,
    days?: number,
  ): Promise<any> {
    try {
      let targetDate: string;
      if (days !== undefined) {
        const today = new Date();
        const target = new Date(today);
        target.setDate(today.getDate() + days);
        targetDate = target.toISOString().split('T')[0];
      }

      const todos = await this.todoService.findAll(userSeq, targetDate);
      const todayOnlyDate = new Date(new Date().setHours(0, 0, 0, 0));

      let filteredTodos = todos;
      if (status) {
        filteredTodos = todos.filter((todo) => {
          const todoDate = new Date(todo.todoDate);
          const isCompleted = todo.completeDtm !== null;
          const isOverdue = !isCompleted && todoDate < todayOnlyDate;

          if (status === 'completed') return isCompleted;
          if (status === 'incomplete') return !isCompleted;
          if (status === 'overdue') return isOverdue;
          return true;
        });
      }

      return {
        totalCount: filteredTodos.length,
        todos: filteredTodos.map((todo) => ({
          todoSeq: todo.todoSeq,
          todoContent: todo.todoContent || '',
          todoDate: todo.todoDate,
          todoNote: todo.todoNote,
          completeDtm: todo.completeDtm,
          isCompleted: todo.completeDtm !== null,
          isOverdue:
            todo.completeDtm === null &&
            todo.todoDate &&
            new Date(todo.todoDate) < todayOnlyDate,
        })),
        queryParams: { status, days, targetDate },
      };
    } catch (error) {
      this.logger.error('[getTodos] Error', error);
      return {
        success: false,
        error: 'Failed to retrieve todos',
        totalCount: 0,
        todos: [],
      };
    }
  }

  private async createTodo(
    userSeq: number,
    userId: string,
    ip: string,
    todoContent: string,
    todoDate: string,
    todoNote?: string,
  ): Promise<any> {
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(todoDate)) {
        return { success: false, error: 'Invalid date format (YYYY-MM-DD)' };
      }

      const user = {
        userSeq,
        userId,
        userName: '',
        userEmail: '',
        userDescription: '',
        userProfileImageFileGroupNo: null,
        adminYn: 'N',
        auditColumns: null,
      } as any;
      const createdTodo = await this.todoService.create(user, ip, {
        todoContent,
        todoDate,
        todoNote,
      });

      const refreshedList = await this.getTodos(userSeq, undefined, 7);
      return {
        success: true,
        data: {
          ...createdTodo,
          createdAt: createdTodo.auditColumns.regDtm.toISOString(),
        },
        refreshedList,
      };
    } catch (error) {
      this.logger.error('[createTodo] Error', error);
      return { success: false, error: 'Failed to create todo' };
    }
  }

  private async updateTodo(
    userSeq: number,
    userId: string,
    ip: string,
    todoSeq?: number,
    todoContentToFind?: string,
    updateData?: {
      todoContent?: string;
      isCompleted?: boolean;
      todoNote?: string;
    },
  ): Promise<any> {
    try {
      let targetTodoSeq = todoSeq;
      if (!targetTodoSeq && todoContentToFind) {
        const search = await this.findTodoByContent(userSeq, todoContentToFind);
        if (!search.success) return search;
        targetTodoSeq = search.todoSeq;
      }
      if (!targetTodoSeq)
        return { success: false, error: 'Missing todoSeq or content to find' };

      const updateTodoDto: any = {};
      if (updateData?.todoContent !== undefined)
        updateTodoDto.todoContent = updateData.todoContent;
      if (updateData?.isCompleted !== undefined)
        updateTodoDto.completeDtm = updateData.isCompleted
          ? new Date().toISOString()
          : null;
      if (updateData?.todoNote !== undefined)
        updateTodoDto.todoNote = updateData.todoNote;

      const user = { userSeq, userId } as any;
      const updatedTodo = await this.todoService.update(
        targetTodoSeq,
        user,
        ip,
        updateTodoDto,
      );

      if (!updatedTodo)
        return { success: false, error: 'Todo not found or access denied' };

      const refreshedList = await this.getTodos(userSeq, undefined, 7);
      return {
        success: true,
        data: {
          ...updatedTodo,
          updatedAt: updatedTodo.auditColumns.updDtm.toISOString(),
        },
        refreshedList,
      };
    } catch (error) {
      this.logger.error('[updateTodo] Error', error);
      return { success: false, error: 'Failed to update todo' };
    }
  }
}
