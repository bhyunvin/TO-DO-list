import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { RequestAssistanceDto } from './assistance.dto';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { GeminiApiResponse } from './gemini.interface';
import { marked } from 'marked';
import * as sanitizeHtml from 'sanitize-html';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TodoService } from '../todo/todo.service';
import { CreateTodoDto } from '../todo/todo.dto';
import { UserEntity } from '../user/user.entity';
import { ConfigService } from '@nestjs/config';
import { decryptSymmetric } from '../utils/cryptUtil';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AssistanceService implements OnModuleInit {
  private readonly logger = new Logger(AssistanceService.name);

  private readonly getTodosTool = {
    functionDeclarations: [
      {
        name: 'getTodos',
        description: '사용자의 할 일 목록을 DB에서 조회합니다.',
        parameters: {
          type: 'OBJECT',
          properties: {
            status: {
              type: 'STRING',
              description:
                "조회할 할 일의 상태. 'completed' (완료), 'incomplete' (미완료), 'overdue' (지연). 지정하지 않으면 모든 상태.",
            },
            days: {
              type: 'NUMBER',
              description:
                '조회할 기간(일). (예: 7은 지난 7일, -7은 향후 7일). 지정하지 않으면 전체 기간.',
            },
          },
        },
      },
    ],
  };

  private readonly createTodoTool = {
    functionDeclarations: [
      {
        name: 'createTodo',
        description:
          '사용자의 새로운 할 일을 생성합니다. 할 일 내용과 날짜는 필수입니다.',
        parameters: {
          type: 'OBJECT',
          properties: {
            todoContent: {
              type: 'STRING',
              description:
                '할 일의 내용 (필수). 사용자가 수행해야 할 작업을 명확하게 설명합니다.',
            },
            todoDate: {
              type: 'STRING',
              description:
                '할 일의 목표 날짜 (필수). YYYY-MM-DD 형식. 사용자가 날짜를 명시하지 않으면 오늘 날짜를 사용합니다.',
            },
            todoNote: {
              type: 'STRING',
              description: '할 일에 대한 추가 메모나 설명 (선택 사항).',
            },
          },
          required: ['todoContent', 'todoDate'],
        },
      },
    ],
  };

  private readonly updateTodoTool = {
    functionDeclarations: [
      {
        name: 'updateTodo',
        description:
          '기존 할 일을 수정합니다. todoSeq 또는 todoContentToFind로 식별할 수 있습니다.',
        parameters: {
          type: 'OBJECT',
          properties: {
            todoSeq: {
              type: 'NUMBER',
              description:
                '수정할 할 일의 고유 ID (선택 사항 - todoContentToFind가 제공되지 않은 경우 필수).',
            },
            todoContentToFind: {
              type: 'STRING',
              description:
                '수정할 할 일을 찾기 위한 내용 검색어 (선택 사항 - todoSeq가 제공되지 않은 경우 필수).',
            },
            todoContent: {
              type: 'STRING',
              description: '수정할 할 일의 새로운 내용 (선택 사항).',
            },
            isCompleted: {
              type: 'BOOLEAN',
              description:
                '완료 상태 (선택 사항). true로 설정하면 작업을 완료로 표시하고, false로 설정하면 미완료로 표시합니다.',
            },
            todoNote: {
              type: 'STRING',
              description: '수정할 메모 내용 (선택 사항).',
            },
          },
        },
      },
    ],
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly todoService: TodoService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * 한국 표준시 기준 현재 날짜 가져오기
   * @returns YYYY-MM-DD 형식의 현재 날짜
   */
  private getCurrentKSTDate(): string {
    const now = new Date();
    const kstOffset = 9 * 60; // KST는 UTC+9 (분 단위)
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
    return kstTime.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * 내용으로 할 일 찾기
   * @param userSeq - 사용자 시퀀스 번호
   * @param contentToFind - 검색할 내용
   * @returns 성공 여부, todoSeq, 오류 메시지를 포함하는 결과 객체
   */
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

      if (matches.length === 0) {
        return { success: false, error: '일치하는 할 일을 찾을 수 없습니다.' };
      }

      if (matches.length === 1) {
        return { success: true, todoSeq: matches[0].todoSeq };
      }

      // 검색 결과가 여러 개인 경우, 미완료된 항목을 우선적으로 찾습니다.
      const incompleteMatches = matches.filter(
        (todo) => todo.completeDtm === null,
      );

      if (incompleteMatches.length === 1) {
        return { success: true, todoSeq: incompleteMatches[0].todoSeq };
      }

      // 여전히 여러 개이거나, 모두 완료된 경우
      return {
        success: false,
        matches: matches.length,
        error: `"${contentToFind}"와 일치하는 할 일이 ${matches.length}개 있습니다. (미완료: ${incompleteMatches.length}개). 더 구체적으로 지정해주세요.`,
      };
    } catch (error) {
      this.logger.error('[findTodoByContent] 검색 중 오류 발생', error);
      return { success: false, error: '할 일 검색에 실패했습니다.' };
    }
  }

  /**
   * 모듈 초기화
   */
  async onModuleInit() {
    this.logger.log('AssistanceService 모듈 초기화 완료');
  }

  /**
   * Gemini API 응답 가져오기
   * @param requestAssistanceDto - 사용자 프롬프트와 대화 기록
   * @param userSeq - 사용자 시퀀스 번호
   * @param ip - 클라이언트 IP 주소
   * @param userName - 사용자 이름
   * @param userId - 사용자 ID
   * @returns AI 응답 DTO
   */
  async getGeminiResponse(
    requestAssistanceDto: RequestAssistanceDto,
    userSeq?: number,
    ip?: string,
    userName?: string,
    userId?: string,
  ): Promise<RequestAssistanceDto> {
    const apiKey = await this.validateAndGetApiKey(userSeq);
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    const systemPrompt = this.loadSystemPrompt(userName);

    const requestData = this.buildGeminiRequest(
      systemPrompt,
      requestAssistanceDto,
    );

    try {
      this.logger.log(
        `[Gemini Request Data] userSeq: ${userSeq}, ip: ${ip}, tools 개수: ${requestData.tools.length}`,
      );
      this.logger.debug(
        `[Gemini Request Data] 전체 requestData: ${JSON.stringify(requestData, null, 2)}`,
      );

      this.logger.log(
        `[Gemini Request] API 요청 전송... Prompt: "${requestAssistanceDto.prompt}"`,
      );

      let response = await firstValueFrom(
        this.httpService.post<GeminiApiResponse>(apiUrl, requestData, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      this.logger.log(
        `[Gemini Response] 1차 응답 받음. candidates 개수: ${response.data.candidates?.length}`,
      );
      this.logger.debug(
        `[Gemini Response] 전체 응답 데이터: ${JSON.stringify(response.data, null, 2)}`,
      );

      const candidate = response.data.candidates[0];
      const firstPart = candidate.content.parts[0] as any;
      const functionCall = firstPart.functionCall || firstPart.function_call;

      this.logger.log(
        `[Gemini Response] firstPart 타입 확인 - functionCall 존재: ${!!functionCall}, text 존재: ${!!firstPart.text}`,
      );

      if (functionCall) {
        const functionResponse = await this.handleFunctionCall(
          functionCall,
          requestData,
          apiUrl,
          firstPart,
          userSeq,
          userId,
          ip,
        );
        if (functionResponse) {
          response = functionResponse;
        }
      }

      const safeHtml = await this.processFinalResponse(response.data);
      requestAssistanceDto.response = safeHtml;
      return requestAssistanceDto;
    } catch (error) {
      this.handleGeminiError(error);
    }
  }

  private async validateAndGetApiKey(userSeq?: number): Promise<string> {
    if (!userSeq) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }

    // 사용자 정보 최신 조회 (API Key 확인용)
    const user = await this.userRepository.findOne({ where: { userSeq } });

    if (!user?.aiApiKey) {
      throw new BadRequestException(
        'AI API Key가 설정되지 않았습니다. 프로필 설정에서 등록해주세요.',
      );
    }

    const apiKey = decryptSymmetric(user.aiApiKey);
    if (!apiKey) {
      this.logger.error(`API Key decryption failed for user ${userSeq}`);
      throw new InternalServerErrorException(
        'API Key 처리 중 오류가 발생했습니다.',
      );
    }
    return apiKey;
  }

  private buildGeminiRequest(
    systemPrompt: string,
    dto: RequestAssistanceDto,
  ): any {
    return {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        ...(dto.history || []),
        {
          parts: [
            {
              text: dto.prompt,
            },
          ],
        },
      ],
      tools: [
        {
          function_declarations: [
            ...this.getTodosTool.functionDeclarations,
            ...this.createTodoTool.functionDeclarations,
            ...this.updateTodoTool.functionDeclarations,
          ],
        },
      ],
    };
  }

  private async handleFunctionCall(
    functionCall: any,
    requestData: any,
    apiUrl: string,
    firstPart: any,
    userSeq: number,
    userId?: string,
    ip?: string,
  ): Promise<any> {
    const functionResult = await this.executeFunctionCall(
      functionCall,
      userSeq,
      userId,
      ip,
    );

    if (functionResult === undefined) {
      this.logger.warn(
        `[Function Execution] functionResult가 undefined - 함수가 실행되지 않았거나 조건 불충족`,
      );
      return null;
    }

    this.logger.log(
      `[Gemini Function Result] ${functionCall.name} 함수 실행 결과 (Gemini에게 전송): ${JSON.stringify(functionResult)}`,
    );

    // 모델의 이전 응답(함수 호출)을 대화 기록에 추가 (role: model)
    requestData.contents.push({
      role: 'model',
      parts: [firstPart],
    });

    // 함수의 실행 결과를 대화 기록에 추가 (role: function)
    const functionResponsePart = {
      role: 'function',
      parts: [
        {
          function_response: {
            name: functionCall.name,
            response: {
              content: functionResult,
            },
          },
        } as any,
      ],
    };
    requestData.contents.push(functionResponsePart);

    this.logger.log(
      `[Gemini Request] 2차 요청 contents 개수: ${requestData.contents.length}`,
    );
    this.logger.debug(
      `[Gemini Request] 2차 요청 전체 requestData: ${JSON.stringify(requestData, null, 2)}`,
    );

    this.logger.log(
      `[Gemini Request] 함수 실행 결과를 포함하여 2차 API 요청...`,
    );

    const response = await firstValueFrom(
      this.httpService.post<GeminiApiResponse>(apiUrl, requestData, {
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    this.logger.log(
      `[Gemini Response] 2차 응답 받음. candidates 개수: ${response.data.candidates?.length}`,
    );
    this.logger.debug(
      `[Gemini Response] 2차 응답 전체 데이터: ${JSON.stringify(response.data, null, 2)}`,
    );

    return response;
  }

  private async processFinalResponse(data: GeminiApiResponse): Promise<string> {
    const finalCandidate = data.candidates[0];
    const finalPart = finalCandidate.content.parts[0];

    this.logger.log(
      `[Gemini Final Response] 최종 part 타입 - text 존재: ${!!(finalPart as any).text}, functionCall 존재: ${!!(finalPart as any).functionCall}`,
    );

    const responseText = (finalPart as any).text;

    // text가 없어도 functionCall이 있으면 유효한 응답으로 처리
    if (!responseText && !(finalPart as any).functionCall) {
      this.logger.error(
        `[Gemini Final Response] 최종 응답에 text와 functionCall이 모두 없음! finalPart: ${JSON.stringify(finalPart)}`,
      );
      throw new InternalServerErrorException(
        'AI Assistant returned invalid response format',
      );
    }

    const safeResponseText = responseText || '';

    this.logger.log(
      `[Gemini Final Response] 최종 텍스트 응답 (첫 100자): ${safeResponseText.substring(0, 100)}...`,
    );

    const unsafeHtml = await marked.parse(safeResponseText);
    return sanitizeHtml.default(unsafeHtml);
  }

  private handleGeminiError(error: any) {
    this.logger.error(
      'Gemini API로부터 응답을 받는데 실패했습니다',
      error.response?.data || error.message,
    );

    if (error instanceof AxiosError && error.response) {
      const status = error.response.status;

      if (status === 503 || status === 429) {
        throw new ServiceUnavailableException(
          'AI 어시스턴트가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.',
        );
      }
    }

    throw new InternalServerErrorException(
      'AI 어시스턴트 API 요청이 실패했습니다',
    );
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
      const dateContext = `\n\n[CURRENT_DATE]\n오늘 날짜: ${currentDate} (YYYY-MM-DD 형식)\n이 날짜를 기준으로 "오늘", "내일", "다음 주" 등의 상대적 날짜를 계산하세요.`;
      systemPrompt = systemPrompt + dateContext;
    } catch (error) {
      this.logger.error('시스템 프롬프트를 불러오는 중 오류 발생:', error);
      systemPrompt = `[ROLE] 당신은 친절한 한국어 비서입니다. 존댓말로 할 일 목록에 관해서만 답변하세요.`;
    }
    return systemPrompt;
  }

  private async executeFunctionCall(
    functionCall: any,
    userSeq: number,
    userId?: string,
    ip?: string,
  ): Promise<any> {
    const args = functionCall.args || {};
    let functionResult: any;

    this.logger.log(
      `[Gemini Function Call] Gemini가 함수 호출 요청: ${functionCall.name}, Args: ${JSON.stringify(args)}`,
    );

    switch (functionCall.name) {
      case 'getTodos':
        if (userSeq) {
          this.logger.log(
            `[Function Execution] getTodos 실행 시작 (userSeq 존재: true)`,
          );
          functionResult = await this.getTodos(userSeq, args.status, args.days);
        } else {
          this.logger.warn(
            `[Function Execution] getTodos 실행 불가 - userSeq가 없음`,
          );
        }
        break;

      case 'createTodo':
        if (userSeq && ip && userId) {
          this.logger.log(
            `[Function Execution] createTodo 실행 시작 (userSeq: ${userSeq}, userId: ${userId}, ip: ${ip})`,
          );
          functionResult = await this.createTodo(
            userSeq,
            userId,
            ip,
            args.todoContent,
            args.todoDate,
            args.todoNote,
          );
        } else {
          this.logger.warn(
            `[Function Execution] createTodo 실행 불가 - userSeq: ${userSeq}, userId: ${userId}, ip: ${ip}`,
          );
        }
        break;

      case 'updateTodo':
        if (userSeq && ip && userId) {
          this.logger.log(
            `[Function Execution] updateTodo 실행 시작 (userSeq: ${userSeq}, userId: ${userId}, ip: ${ip}, todoSeq: ${args.todoSeq}, todoContentToFind: ${args.todoContentToFind})`,
          );
          functionResult = await this.updateTodo(
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
        } else {
          this.logger.warn(
            `[Function Execution] updateTodo 실행 불가 - userSeq: ${userSeq}, userId: ${userId}, ip: ${ip}`,
          );
        }
        break;

      default:
        this.logger.warn(`알 수 없는 함수 호출: ${functionCall.name}`);
    }

    return functionResult;
  }

  private async getTodos(
    userSeq: number,
    status?: string,
    days?: number,
  ): Promise<any> {
    this.logger.log(
      `[getTodos] 함수 시작. userSeq: ${userSeq}, status: ${status}, days: ${days}`,
    );

    try {
      let targetDate: string;
      const today = new Date();

      if (days === undefined) {
        targetDate = null;
      } else {
        const targetDateObj = new Date(today);
        targetDateObj.setDate(today.getDate() + days);
        targetDate = targetDateObj.toISOString().split('T')[0];
      }

      this.logger.log(
        `[getTodos] targetDate 계산됨: ${targetDate} (days: ${days})`,
      );

      const todos = await this.todoService.findAll(userSeq, targetDate);

      this.logger.log(
        `[getTodos] todoService.findAll(${userSeq}, ${targetDate}) 결과: 총 ${todos.length}개`,
      );

      let filteredTodos = todos;

      const todayOnlyDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );

      if (status) {
        filteredTodos = todos.filter((todo) => {
          const todoDate = new Date(todo.todoDate);
          const isCompleted = todo.completeDtm !== null;

          const isOverdue = !isCompleted && todoDate < todayOnlyDate;

          switch (status) {
            case 'completed':
              return isCompleted;

            case 'incomplete':
              return !isCompleted;

            case 'overdue':
              return isOverdue;

            default:
              return true;
          }
        });

        this.logger.log(
          `[getTodos] status='${status}' 필터링 결과: ${filteredTodos.length}개`,
        );
      }

      const result = {
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
        queryParams: {
          status,
          days,
          targetDate,
        },
      };

      this.logger.log(
        `[getTodos] 최종 반환 데이터 (요약): totalCount: ${result.totalCount}, queryParams: ${JSON.stringify(result.queryParams)}`,
      );

      return result;
    } catch (error) {
      this.logger.error('[getTodos] 함수 실행 중 오류 발생', error);
      return {
        success: false,
        error: '할 일 데이터를 가져오는데 실패했습니다',
        totalCount: 0,
        todos: [],
      };
    }
  }

  /**
   * 새로운 할 일 항목 생성
   * @param userSeq - 사용자 시퀀스 번호
   * @param userId - 사용자 ID
   * @param ip - 클라이언트 IP 주소
   * @param todoContent - 할 일 내용
   * @param todoDate - YYYY-MM-DD 형식의 목표 날짜
   * @param todoNote - 추가 메모
   * @returns 성공 여부와 생성된 할 일 데이터
   */
  private async createTodo(
    userSeq: number,
    userId: string,
    ip: string,
    todoContent: string,
    todoDate: string,
    todoNote?: string,
  ): Promise<any> {
    this.logger.log(
      `[createTodo] 함수 시작. userSeq: ${userSeq}, userId: ${userId}, todoContent: "${todoContent}", todoDate: ${todoDate}, todoNote: ${todoNote}`,
    );

    try {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(todoDate)) {
        this.logger.warn(
          `[createTodo] 날짜 형식 오류: ${todoDate} (YYYY-MM-DD 형식 필요)`,
        );
        return {
          success: false,
          error:
            '잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용해주세요 (예: 2024-12-31)',
        };
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
      } as Omit<UserEntity, 'userPassword' | 'setProfileImage'>;

      const createTodoDto: CreateTodoDto = {
        todoContent,
        todoDate,
        todoNote,
      };

      const createdTodo = await this.todoService.create(
        user,
        ip,
        createTodoDto,
      );

      this.logger.log(
        `[createTodo] Todo 생성 성공. todoSeq: ${createdTodo.todoSeq}`,
      );

      const refreshedList = await this.getTodos(userSeq, undefined, 7);

      const result = {
        success: true,
        data: {
          todoSeq: createdTodo.todoSeq,
          todoContent: createdTodo.todoContent,
          todoDate: createdTodo.todoDate,
          todoNote: createdTodo.todoNote,
          completeDtm: createdTodo.completeDtm,
          createdAt: createdTodo.auditColumns.regDtm.toISOString(),
        },
        refreshedList,
      };

      this.logger.log(
        `[createTodo] 최종 반환 데이터: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      this.logger.error('[createTodo] 함수 실행 중 오류 발생', error);
      return {
        success: false,
        error: 'TODO 항목 생성에 실패했습니다. 다시 시도해주세요.',
      };
    }
  }

  /**
   * 기존 할 일 항목 업데이트
   * @param userSeq - 사용자 시퀀스 번호
   * @param userId - 사용자 ID
   * @param ip - 클라이언트 IP 주소
   * @param todoSeq - 할 일 시퀀스 번호
   * @param todoContentToFind - 내용 검색어
   * @param updateData - 업데이트할 필드
   * @returns 성공 여부와 업데이트된 할 일 데이터
   */
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
    this.logger.log(
      `[updateTodo] 함수 시작. userSeq: ${userSeq}, userId: ${userId}, todoSeq: ${todoSeq}, todoContentToFind: ${todoContentToFind}, updateData: ${JSON.stringify(updateData)}`,
    );

    try {
      let targetTodoSeq = todoSeq;

      if (!targetTodoSeq && todoContentToFind) {
        const searchResult = await this.findTodoByContent(
          userSeq,
          todoContentToFind,
        );
        if (!searchResult.success) {
          return searchResult;
        }
        targetTodoSeq = searchResult.todoSeq;
      }

      if (!targetTodoSeq) {
        return {
          success: false,
          error: 'todoSeq 또는 todoContentToFind가 필요합니다.',
        };
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
      } as Omit<UserEntity, 'userPassword' | 'setProfileImage'>;

      const updateTodoDto: any = {};
      if (updateData?.todoContent !== undefined) {
        updateTodoDto.todoContent = updateData.todoContent;
      }
      if (updateData?.isCompleted !== undefined) {
        updateTodoDto.completeDtm = updateData.isCompleted
          ? new Date().toISOString()
          : null;
      }
      if (updateData?.todoNote !== undefined) {
        updateTodoDto.todoNote = updateData.todoNote;
      }

      this.logger.log(
        `[updateTodo] updateTodoDto: ${JSON.stringify(updateTodoDto)}`,
      );

      this.logger.log(`[updateTodo] todoService.update 호출 중...`);
      const updatedTodo = await this.todoService.update(
        targetTodoSeq,
        user,
        ip,
        updateTodoDto,
      );

      if (!updatedTodo) {
        this.logger.warn(
          `[updateTodo] Todo를 찾을 수 없거나 접근 권한 없음. todoSeq: ${todoSeq}`,
        );
        return {
          success: false,
          error: 'TODO 항목을 찾을 수 없거나 접근이 거부되었습니다',
        };
      }

      this.logger.log(
        `[updateTodo] Todo 수정 성공. todoSeq: ${updatedTodo.todoSeq}`,
      );

      const refreshedList = await this.getTodos(userSeq, undefined, 7);

      const result = {
        success: true,
        data: {
          todoSeq: updatedTodo.todoSeq,
          todoContent: updatedTodo.todoContent,
          todoDate: updatedTodo.todoDate,
          todoNote: updatedTodo.todoNote,
          completeDtm: updatedTodo.completeDtm,
          updatedAt: updatedTodo.auditColumns.updDtm.toISOString(),
        },
        refreshedList,
      };

      this.logger.log(
        `[updateTodo] 최종 반환 데이터: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      this.logger.error('[updateTodo] 함수 실행 중 오류 발생', error);
      return {
        success: false,
        error: 'TODO 항목 업데이트에 실패했습니다. 다시 시도해주세요.',
      };
    }
  }
}
