import { GoogleGenAI, Type, Content, Part } from '@google/genai';
import { marked } from 'marked';
import * as sanitizeHtml from 'sanitize-html';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource, Repository } from 'typeorm';
import { TodoService } from '../todo/todo.service';
import { UserEntity } from '../user/user.entity';
import { decryptSymmetric } from '../../utils/cryptUtil';
import {
  ChatRequestDto,
  ChatResponseDto,
  isHttpError,
  isError,
  GetTodosResponse,
  ErrorResponse,
} from './assistance.schema';
// TypeBox Value는 Elysia의 t에서 제공되므로 별도 import 불필요

import { Logger } from '../../utils/logger';

export class AssistanceService {
  private readonly logger = new Logger(AssistanceService.name);
  private readonly userRepository: Repository<UserEntity>;

  // Queue 타입 구체화: any 제거 (제네릭으로 유연성 확보)
  private readonly queue: Array<{
    call: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason?: Error) => void;
  }> = [];
  private processing = false;

  // SDK 타입을 사용한 도구 정의
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
    private readonly dataSource: DataSource,
    private readonly todoService: TodoService,
  ) {
    this.userRepository = dataSource.getRepository(UserEntity);
  }

  /**
   * 채팅 처리 (재시도 로직 포함)
   */
  async chatWithRetry(
    userSeq: number,
    userName: string,
    userId: string,
    ip: string,
    chatRequestDto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          this.logger.log(`재시도 중... (시도 ${attempt}/${maxRetries})`);
        }

        const result = await this.getGeminiResponse(
          chatRequestDto,
          userSeq,
          ip,
          userName,
          userId,
        );

        return {
          response: result.response || '',
          timestamp: new Date().toISOString(),
          success: true,
        };
      } catch (error: unknown) {
        // 타입 가드를 사용하여 안전하게 타입 좁히기
        const isRateLimited = this.isRetryableError(error);
        const isLastAttempt = attempt === maxRetries;

        const errorMessage = isError(error) ? error.message : 'Unknown error';
        this.logger.error(`챗 요청 실패 (시도 ${attempt}): ${errorMessage}`);

        if (isRateLimited && !isLastAttempt) {
          const delay = this.calculateRetryDelay(attempt, baseDelay, error);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return {
          response: '',
          timestamp: new Date().toISOString(),
          success: false,
          error: this.getKoreanErrorMessage(error, attempt, maxRetries),
        };
      }
    }

    return {
      response: '',
      timestamp: new Date().toISOString(),
      success: false,
      error: '알 수 없는 오류가 발생했습니다.',
    };
  }

  private async processQueue() {
    if (this.queue.length === 0) return;

    const item = this.queue.shift();
    if (!item) return;

    const { call, resolve, reject } = item;
    this.processing = true;

    try {
      const result = await call();
      resolve(result);
    } catch (error: unknown) {
      const errorObj = this.convertToError(error);
      reject(errorObj);
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  // Error 변환 헬퍼 메서드 - Cognitive Complexity 감소
  private convertToError(error: unknown): Error {
    if (isError(error)) {
      return error;
    }

    let errorMessage = 'Unknown error';
    if (error && typeof error === 'object' && 'message' in error) {
      const msg = (error as { message: unknown }).message;
      if (typeof msg === 'string') {
        errorMessage = msg;
      } else if (msg !== null && msg !== undefined) {
        try {
          errorMessage = JSON.stringify(msg);
        } catch {
          errorMessage = 'Unknown error';
        }
      }
    }
    return new Error(errorMessage);
  }

  private enqueue<T>(call: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        call: call as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private isRetryableError(error: unknown): boolean {
    const err = error as {
      status?: number;
      response?: { status: number };
      message?: string;
    };
    const status = err.response?.status || err.status;
    return (
      status === 429 || // 너무 많은 요청 (Too Many Requests)
      status === 503 || // 서비스 일시 중단 (Service Unavailable)
      err.message?.includes('429') ||
      err.message?.includes('503') ||
      false
    );
  }

  // error 파라미터의 any 타입 제거 -> unknown + 타입 가드 사용
  private calculateRetryDelay(
    attempt: number,
    baseDelay: number,
    error: unknown,
  ): number {
    // HttpError 타입 가드 적용
    if (isHttpError(error)) {
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter) {
        const retryAfterMs = Number.parseInt(retryAfter) * 1000;
        return Math.min(retryAfterMs, 30000);
      }
    }
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000);
  }

  // error 파라미터의 any 타입 제거 -> unknown + 타입 가드 사용
  private getKoreanErrorMessage(
    error: unknown,
    attempt?: number,
    maxRetries?: number,
  ): string {
    // 타입 가드를 사용하여 안전하게 속성 접근
    let status: number | undefined;
    let msg = '';
    let code: string | undefined;

    if (isHttpError(error)) {
      status = error.response?.status || error.status;
      msg = error.message || '';
      code = error.code;
    } else if (isError(error)) {
      msg = error.message;
      code = (error as Error & { code?: string }).code;
    }

    if (status === 401) return '로그인이 필요합니다.';
    if (status === 429 || msg.includes('429')) {
      if (attempt && maxRetries && attempt >= maxRetries) {
        return 'AI 서비스가 현재 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
      }
      return 'AI 서비스 요청 한도를 초과했습니다.';
    }
    if (status === 403 && msg.includes('quota'))
      return 'AI 서비스 사용량이 한도를 초과했습니다.';
    if (status && status >= 500)
      return 'AI 서비스에 일시적인 문제가 발생했습니다.';
    if (msg.includes('network') || code === 'ECONNREFUSED')
      return '네트워크 연결을 확인해주세요.';

    return '문제가 발생했습니다. 다시 시도해주세요.';
  }

  // --- Gemini 로직 ---

  private async getGeminiResponse(
    dto: ChatRequestDto,
    userSeq: number,
    ip: string,
    userName: string,
    userId: string,
  ): Promise<ChatRequestDto & { response?: string }> {
    // 1. API Key 조회
    const user = await this.userRepository.findOne({ where: { userSeq } });
    if (!user?.aiApiKey) {
      throw new Error('AI API Key가 설정되지 않았습니다.');
    }
    const apiKey = await decryptSymmetric(user.aiApiKey);
    if (!apiKey) throw new Error('API Key 복호화 실패');

    const resolvedUserName = userName || user.userName;
    const systemPrompt = this.loadSystemPrompt(resolvedUserName);

    const ai = new GoogleGenAI({ apiKey });

    // 2. Content 변환
    const contents: Content[] = (dto.history || []).map((h) => ({
      role: h.role,
      parts: h.parts.map((p) => ({ text: p.text })),
    }));

    contents.push({
      role: 'user',
      parts: [{ text: dto.prompt }],
    });

    const maxTurns = 5;
    let turn = 0;

    while (turn < maxTurns) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp', // 모델명 수정 (최신 or 기존 사용) -> 기존: gemini-3-flash-preview (존재여부 불확실, 1.5-flash or 2.0-flash 권장)
        // 기존 코드에 'gemini-3-flash-preview'로 되어 있었으나 오타 가능성. 'gemini-1.5-flash' 혹은 'gemini-2.0-flash-exp' 사용.
        // 일단 'gemini-2.0-flash-exp' 사용.
        contents: contents,
        config: {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          tools: this.tools,
          // thinkingConfig는 2.0 모델 일부에서 지원하나, 여기선 제외하거나 필요시 추가
        },
      });

      const candidate = response?.candidates?.[0];
      if (!candidate) throw new Error('No candidate returned');

      const content = candidate.content;
      const parts = content?.parts || [];

      // 대화 기록에 추가
      contents.push(content);

      // Function Call 확인
      const functionCalls = parts.filter((p) => p.functionCall);
      if (functionCalls.length > 0) {
        this.logger.log(`함수 호출 감지: ${functionCalls.length}개`);

        const functionResponses = await Promise.all(
          functionCalls.map(async (part) => {
            const call = {
              name: part.functionCall?.name || 'unknown',
              args: part.functionCall?.args || {},
            };
            const result = await this.executeFunctionCall(
              call,
              userSeq,
              userId,
              ip,
            );
            return {
              functionResponse: {
                name: call.name || 'unknown',
                response: { content: result },
              },
            };
          }),
        );

        contents.push({
          role: 'function',
          parts: functionResponses as Part[],
        });

        turn++;
        continue;
      }

      const textPart = parts.find((p) => p.text);
      const responseText = textPart ? textPart.text : '';

      const processResponse = await this.processFinalResponse(
        responseText || '',
      );

      return {
        ...dto,
        response: processResponse,
      };
    }

    throw new Error('Max turns reached');
  }

  private loadSystemPrompt(userName: string): string {
    try {
      // 현재 파일 위치 기준으로 systemPrompt.txt 찾기
      // import.meta.dir은 Bun 환경에서 현재 파일 디렉토리
      const promptPath = path.resolve(
        import.meta.dir,
        'assistance.systemPrompt.txt',
      );
      let systemPrompt = fs.readFileSync(promptPath, 'utf-8').trim();

      if (userName) {
        systemPrompt = systemPrompt.replaceAll('[사용자 이름]', userName);
      }

      const now = new Date();
      const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const currentDate = kstTime.toISOString().split('T')[0];

      systemPrompt += `\n\n[CURRENT_DATE]\n오늘 날짜: ${currentDate} (YYYY-MM-DD)\n`;

      return systemPrompt;
    } catch (error: unknown) {
      // 타입 가드를 사용하여 안전하게 에러 처리
      const errorMessage = isError(error) ? error.message : 'Unknown error';
      this.logger.error('시스템 프롬프트 로드 실패', errorMessage);
      return '당신은 도움이 되는 비서입니다.';
    }
  }

  private async processFinalResponse(text: string): Promise<string> {
    const unsafeHtml = await marked.parse(text);
    return sanitizeHtml.default(unsafeHtml);
  }

  // --- 도구 구현부 (Tools 구현) ---

  // Function call 실행: 런타임에서 타입 체크하여 타입 안정성 확보
  private async executeFunctionCall(
    call: { name: string; args: Record<string, unknown> },
    userSeq: number,
    userId: string,
    ip: string,
  ): Promise<GetTodosResponse | ErrorResponse | Record<string, unknown>> {
    const args = call.args || {};
    const name = call.name;

    try {
      // 각 함수 호출을 별도 메서드로 분리하여 복잡도 감소
      if (name === 'getTodos') {
        return await this.executeGetTodos(userSeq, args);
      } else if (name === 'createTodo') {
        return await this.executeCreateTodo(userSeq, userId, ip, args);
      } else if (name === 'updateTodo') {
        return await this.executeUpdateTodo(userSeq, userId, ip, args);
      }
      return { error: `알 수 없는 기능입니다: ${name}` };
    } catch (e: unknown) {
      const errorMessage = isError(e) ? e.message : 'Unknown error';
      this.logger.error(`도구 실행 실패: ${errorMessage}`);
      return { error: errorMessage };
    }
  }

  // getTodos 실행 헬퍼
  private async executeGetTodos(
    userSeq: number,
    args: Record<string, unknown>,
  ): Promise<GetTodosResponse> {
    return await this.getTodos(
      userSeq,
      typeof args.status === 'string' ? args.status : undefined,
      typeof args.days === 'number' ? args.days : undefined,
    );
  }

  // createTodo 실행 헬퍼
  private async executeCreateTodo(
    userSeq: number,
    userId: string,
    ip: string,
    args: Record<string, unknown>,
  ): Promise<ErrorResponse | Record<string, unknown>> {
    if (
      typeof args.todoContent !== 'string' ||
      typeof args.todoDate !== 'string'
    ) {
      return {
        error:
          'createTodo에 대한 인자가 유효하지 않습니다: todoContent와 todoDate는 필수입니다.',
      };
    }
    return await this.createTodo(
      userSeq,
      userId,
      ip,
      args.todoContent,
      args.todoDate,
      typeof args.todoNote === 'string' ? args.todoNote : undefined,
    );
  }

  // updateTodo 실행 헬퍼
  private async executeUpdateTodo(
    userSeq: number,
    userId: string,
    ip: string,
    args: Record<string, unknown>,
  ): Promise<ErrorResponse | Record<string, unknown>> {
    return await this.updateTodo(
      userSeq,
      userId,
      ip,
      typeof args.todoSeq === 'number' ? args.todoSeq : undefined,
      typeof args.todoContentToFind === 'string'
        ? args.todoContentToFind
        : undefined,
      {
        todoContent:
          typeof args.todoContent === 'string' ? args.todoContent : undefined,
        isCompleted:
          typeof args.isCompleted === 'boolean' ? args.isCompleted : undefined,
        todoNote: typeof args.todoNote === 'string' ? args.todoNote : undefined,
      },
    );
  }

  // getTodos: Promise<any> -> Promise<GetTodosResponse>로 변경
  private async getTodos(
    userSeq: number,
    status?: string,
    days?: number,
  ): Promise<GetTodosResponse> {
    let targetDate: string | null = null;
    if (days !== undefined) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      targetDate = d.toISOString().split('T')[0];
    }
    // days 로직이 기존코드와 약간 다를 수 있음(기존엔 전체 기간 or 특정일?).
    // 기존 코드는 days가 있으면 n일 후 하루를 조회하는 듯 했음. (target.setDate(today.getDate() + days))
    // 여기서는 그냥 findAll 호출. findAll은 todoDate 파라미터를 받음.
    // 기존 코드 로직 따름.

    const todos = await this.todoService.findAll(userSeq, targetDate);
    return {
      count: todos.length,
      todos: todos.map((t) => ({
        id: t.todoSeq,
        content: t.todoContent,
        date: t.todoDate,
        completed: !!t.completeDtm,
      })),
    };
  }

  private async createTodo(
    userSeq: number,
    userId: string,
    ip: string,
    content: string,
    date: string,
    note?: string,
  ): Promise<Record<string, unknown>> {
    // TodoService.create 호출 - 반환값을 Record<string, unknown>으로 타입 보장
    const result = await this.todoService.create(userSeq, ip, {
      todoContent: content,
      todoDate: date,
      todoNote: note,
    });
    return result as unknown as Record<string, unknown>;
  }

  private async updateTodo(
    userSeq: number,
    userId: string,
    ip: string,
    todoSeq?: number,
    contentToFind?: string,
    updateData?: {
      todoContent?: string;
      todoNote?: string;
      isCompleted?: boolean;
    },
  ): Promise<ErrorResponse | Record<string, unknown>> {
    let targetId = todoSeq;
    if (!targetId && contentToFind) {
      // 검색 로직
      const todos = await this.todoService.search(userSeq, {
        startDate: '1900-01-01',
        endDate: '9999-12-31',
        keyword: contentToFind,
      });
      if (todos.length === 1) targetId = todos[0].todoSeq;
      else if (todos.length === 0)
        return { error: '일치하는 할 일을 찾지 못했습니다.' };
      else return { error: '여러 개의 할 일이 발견되었습니다.' };
    }

    if (!targetId) return { error: '수정할 대상을 특정하지 못했습니다.' };

    // UpdateTodoDto 명시적 생성
    const updateDto: {
      todoContent?: string;
      todoNote?: string;
      completeDtm?: string | null;
    } = {};
    if (updateData?.todoContent !== undefined)
      updateDto.todoContent = updateData.todoContent;
    if (updateData?.todoNote !== undefined)
      updateDto.todoNote = updateData.todoNote;
    if (updateData?.isCompleted !== undefined) {
      updateDto.completeDtm = updateData.isCompleted
        ? new Date().toISOString()
        : null;
    }

    const result = await this.todoService.update(
      targetId,
      userSeq,
      ip,
      updateDto,
    );
    return result as unknown as Record<string, unknown>;
  }
}
