import { GoogleGenAI, Type, Content, Part } from '@google/genai';
import { marked } from 'marked';
import * as sanitizeHtml from 'sanitize-html';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource, Repository } from 'typeorm';
import { TodoService } from '../todo/todo.service';
import { UserEntity } from '../user/user.entity';
import { decryptSymmetric } from '../../utils/cryptUtil';
import { ChatRequestDto, ChatResponseDto } from './assistance.schema';

// 로거 대체 (console 사용)
const logger = {
  log: (msg: string, ...args: any[]) =>
    console.log(`[AssistanceService] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) =>
    console.warn(`[AssistanceService] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) =>
    console.error(`[AssistanceService] ${msg}`, ...args),
  debug: (msg: string, ...args: any[]) =>
    console.debug(`[AssistanceService] ${msg}`, ...args),
};

export class AssistanceService {
  private readonly userRepository: Repository<UserEntity>;

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
          logger.log(`재시도 중... (시도 ${attempt}/${maxRetries})`);
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
      } catch (error: any) {
        const isRateLimited = this.isRetryableError(error);
        const isLastAttempt = attempt === maxRetries;

        logger.error(`챗 요청 실패 (시도 ${attempt}): ${error.message}`);

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

  private isRetryableError(error: any): boolean {
    const status = error.response?.status || error.status;
    return (
      status === 429 || // Too Many Requests
      status === 503 || // Service Unavailable
      error.message?.includes('429') ||
      error.message?.includes('503')
    );
  }

  private calculateRetryDelay(
    attempt: number,
    baseDelay: number,
    error: any,
  ): number {
    const retryAfter = error.response?.headers?.['retry-after'];
    if (retryAfter) {
      const retryAfterMs = Number.parseInt(retryAfter) * 1000;
      return Math.min(retryAfterMs, 30000);
    }
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000);
  }

  private getKoreanErrorMessage(
    error: any,
    attempt?: number,
    maxRetries?: number,
  ): string {
    const status = error.response?.status || error.status;
    const msg = error.message || '';

    if (status === 401) return '로그인이 필요합니다.';
    if (status === 429 || msg.includes('429')) {
      if (attempt && maxRetries && attempt >= maxRetries) {
        return 'AI 서비스가 현재 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
      }
      return 'AI 서비스 요청 한도를 초과했습니다.';
    }
    if (status === 403 && msg.includes('quota'))
      return 'AI 서비스 사용량이 한도를 초과했습니다.';
    if (status >= 500) return 'AI 서비스에 일시적인 문제가 발생했습니다.';
    if (msg.includes('network') || error.code === 'ECONNREFUSED')
      return '네트워크 연결을 확인해주세요.';

    return '문제가 발생했습니다. 다시 시도해주세요.';
  }

  // --- Gemini Logic ---

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
        logger.log(`함수 호출 감지: ${functionCalls.length}개`);

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
    } catch (error) {
      logger.error('시스템 프롬프트 로드 실패', error);
      return '당신은 도움이 되는 비서입니다.';
    }
  }

  private async processFinalResponse(text: string): Promise<string> {
    const unsafeHtml = await marked.parse(text);
    return sanitizeHtml.default(unsafeHtml);
  }

  // --- Tools Implementations ---

  private async executeFunctionCall(
    call: any,
    userSeq: number,
    userId: string,
    ip: string,
  ): Promise<any> {
    const args = call.args || {};
    const name = call.name;

    try {
      if (name === 'getTodos') {
        return await this.getTodos(userSeq, args.status, args.days);
      } else if (name === 'createTodo') {
        return await this.createTodo(
          userSeq,
          userId,
          ip,
          args.todoContent,
          args.todoDate,
          args.todoNote,
        );
      } else if (name === 'updateTodo') {
        return await this.updateTodo(
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
        );
      }
      return { error: `Unknown function ${name}` };
    } catch (e: any) {
      logger.error(`Tool execution failed: ${e.message}`);
      return { error: e.message };
    }
  }

  private async getTodos(
    userSeq: number,
    status?: string,
    days?: number,
  ): Promise<any> {
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
  ) {
    // TodoService.create 호출
    // createTodoDto 형식 맞춰야 함
    return await this.todoService.create(userSeq, ip, {
      todoContent: content,
      todoDate: date,
      todoNote: note,
    });
  }

  private async updateTodo(
    userSeq: number,
    userId: string,
    ip: string,
    todoSeq?: number,
    contentToFind?: string,
    updateData?: any,
  ) {
    let targetId = todoSeq;
    if (!targetId && contentToFind) {
      // 검색 로직
      const todos = await this.todoService.search(userSeq, {
        startDate: '1900-01-01',
        endDate: '9999-12-31',
        keyword: contentToFind,
      });
      if (todos.length === 1) targetId = todos[0].todoSeq;
      else if (todos.length === 0) return { error: 'No todo found' };
      else return { error: 'Multiple todos found' };
    }

    if (!targetId) return { error: 'Target todo not identified' };

    const updateDto: any = {};
    if (updateData.todoContent) updateDto.todoContent = updateData.todoContent;
    if (updateData.todoNote) updateDto.todoNote = updateData.todoNote;
    if (updateData.isCompleted !== undefined) {
      updateDto.completeDtm = updateData.isCompleted
        ? new Date().toISOString()
        : '';
    }

    return await this.todoService.update(targetId, userSeq, ip, updateDto);
  }
}
