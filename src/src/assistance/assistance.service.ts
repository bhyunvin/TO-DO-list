import { Injectable, Logger, OnModuleInit, InternalServerErrorException, ServiceUnavailableException, } from '@nestjs/common';
import { RequestAssistanceDto } from './assistance.dto';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
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
export class AssistanceService implements OnModuleInit {
  private readonly logger = new Logger(AssistanceService.name);

  private geminiApiKey: string;

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
          '기존 할 일을 수정합니다. 할 일 ID는 필수이며, 수정할 필드만 포함합니다.',
        parameters: {
          type: 'OBJECT',
          properties: {
            todoSeq: {
              type: 'NUMBER',
              description:
                '수정할 할 일의 고유 ID (필수). 사용자가 참조한 할 일의 ID를 사용합니다.',
            },
            todoContent: {
              type: 'STRING',
              description: '수정할 할 일의 내용 (선택 사항).',
            },
            completeDtm: {
              type: 'STRING',
              description:
                '완료 일시 (선택 사항). 완료 처리 시 현재 시각의 ISO 8601 형식 문자열, 미완료 처리 시 null.',
            },
            todoNote: {
              type: 'STRING',
              description: '수정할 메모 내용 (선택 사항).',
            },
          },
          required: ['todoSeq'],
        },
      },
    ],
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly keychainUtil: KeychainUtil,
    private readonly todoService: TodoService,
  ) {}

  /**
   * 모듈이 초기화될 때 딱 한 번 실행됩니다.
   * 키체인에서 API 키를 비동기적으로 불러와 복호화한 후,
   * 클래스 속성(this.geminiApiKey)에 저장합니다.
   */
  async onModuleInit() {
    this.logger.log('AssistanceService 모듈 초기화 중...');
    try {
      const encryptedKey = await this.keychainUtil.getPassword(
        'encrypt-google-api-key',
      );
      this.geminiApiKey = await decrypt(encryptedKey);
      this.logger.log('✅ Gemini API 키 로드 및 복호화 완료.');
    } catch (error) {
      this.logger.error(
        '🚨 FATAL: Gemini API 키 로드 또는 복호화 실패. AI 비서 기능이 작동하지 않을 수 있습니다.',
        error,
      );
      // 키 로드에 실패하면 서비스가 정상 작동할 수 없으므로,
      // 필요하다면 여기서 에러를 throw 하여 애플리케이션 시작을 중단시킬 수도 있습니다.
      // throw new Error('Failed to load Gemini API key.');
    }
  }

  /**
   * Gets a response from Gemini API with function calling support
   * @param requestAssistanceDto - The request containing user prompt and conversation history
   * @param userSeq - Optional user sequence number for authenticated operations
   * @param ip - Optional client IP address for audit logging
   * @param userName - Optional user name for personalized responses
   * @returns Response DTO with AI-generated response
   */
  async getGeminiResponse(
    requestAssistanceDto: RequestAssistanceDto,
    userSeq?: number,
    ip?: string,
    userName?: string,
  ): Promise<RequestAssistanceDto> {
    if (!this.geminiApiKey) {
      this.logger.error(
        'Gemini API 키가 로드되지 않았습니다. onModuleInit 로그를 확인하세요.',
      );
      throw new InternalServerErrorException(
        'AI 비서가 현재 설정되지 않았습니다.',
      );
    }

    const apiKey = this.geminiApiKey;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    let systemPrompt = '';

    try {
      const promptPath =
        process.env.SYSTEM_PROMPT_PATH ||
        './src/assistance/assistance.systemPrompt.txt';
      systemPrompt = fs.readFileSync(path.resolve(promptPath), 'utf-8').trim();
      
      // Replace [사용자 이름] placeholder with actual user name
      if (userName) {
        systemPrompt = systemPrompt.replace(/\[사용자 이름\]/g, userName);
      }
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
      // ⬇️ [로그 추가] 0. 요청 데이터 전체 구조 확인
      this.logger.log(
        `[Gemini Request Data] userSeq: ${userSeq}, ip: ${ip}, tools 개수: ${requestData.tools.length}`,
      );
      this.logger.debug(
        `[Gemini Request Data] 전체 requestData: ${JSON.stringify(requestData, null, 2)}`,
      );

      // ⬇️ [로그 추가] 1. Gemini API에 첫 번째 요청 전송
      this.logger.log(
        `[Gemini Request] API 요청 전송... Prompt: "${requestAssistanceDto.prompt}"`,
      );

      // First API call to get initial response or function call request
      let response = await firstValueFrom(
        this.httpService.post<GeminiApiResponse>(apiUrl, requestData, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      // ⬇️ [로그 추가] 1-1. Gemini API 응답 전체 구조 확인
      this.logger.log(
        `[Gemini Response] 1차 응답 받음. candidates 개수: ${response.data.candidates?.length}`,
      );
      this.logger.debug(
        `[Gemini Response] 전체 응답 데이터: ${JSON.stringify(response.data, null, 2)}`,
      );

      const candidate = response.data.candidates[0];
      const firstPart = candidate.content.parts[0] as any;

      // ⬇️ [로그 추가] 1-2. 첫 번째 part의 타입 확인
      this.logger.log(
        `[Gemini Response] firstPart 타입 확인 - functionCall 존재: ${!!firstPart.functionCall}, text 존재: ${!!firstPart.text}`,
      );

      // Check if Gemini wants to call a function
      if (firstPart.functionCall) {
        const functionCall = firstPart.functionCall;
        const args = functionCall.args || {};
        let functionResult: any;

        // ⬇️ [로그 추가] 2. Gemini가 함수 호출을 요청함
        this.logger.log(
          `[Gemini Function Call] Gemini가 함수 호출 요청: ${functionCall.name}, Args: ${JSON.stringify(args)}`,
        );

        // Execute the appropriate function based on function name
        switch (functionCall.name) {
          case 'getTodos':
            if (userSeq) {
              this.logger.log(
                `[Function Execution] getTodos 실행 시작 (userSeq 존재: true)`,
              );
              functionResult = await this.getTodos(
                userSeq,
                args.status,
                args.days,
              );
            } else {
              this.logger.warn(
                `[Function Execution] getTodos 실행 불가 - userSeq가 없음`,
              );
            }
            break;

          case 'createTodo':
            if (userSeq && ip) {
              this.logger.log(
                `[Function Execution] createTodo 실행 시작 (userSeq: ${userSeq}, ip: ${ip})`,
              );
              functionResult = await this.createTodo(
                userSeq,
                ip,
                args.todoContent,
                args.todoDate,
                args.todoNote,
              );
            } else {
              this.logger.warn(
                `[Function Execution] createTodo 실행 불가 - userSeq: ${userSeq}, ip: ${ip}`,
              );
            }
            break;

          case 'updateTodo':
            if (userSeq && ip) {
              this.logger.log(
                `[Function Execution] updateTodo 실행 시작 (userSeq: ${userSeq}, ip: ${ip}, todoSeq: ${args.todoSeq})`,
              );
              functionResult = await this.updateTodo(
                userSeq,
                ip,
                args.todoSeq,
                {
                  todoContent: args.todoContent,
                  completeDtm: args.completeDtm,
                  todoNote: args.todoNote,
                },
              );
            } else {
              this.logger.warn(
                `[Function Execution] updateTodo 실행 불가 - userSeq: ${userSeq}, ip: ${ip}`,
              );
            }
            break;

          default:
            this.logger.warn(`Unknown function call: ${functionCall.name}`);
        }

        // If a function was executed, add the call and response to conversation
        if (functionResult !== undefined) {
          // ⬇️ [로그 추가] 3. 로컬 함수 실행 완료 및 결과
          this.logger.log(
            `[Gemini Function Result] ${functionCall.name} 함수 실행 결과 (Gemini에게 전송): ${JSON.stringify(functionResult)}`,
          );

          // Add function call to conversation
          requestData.contents.push({
            parts: [candidate.content.parts[0] as any],
          });

          // Add function response to conversation
          const functionResponsePart = {
            parts: [
              {
                functionResponse: {
                  name: functionCall.name,
                  response: {
                    content: functionResult,
                  },
                },
              } as any,
            ],
          };
          requestData.contents.push(functionResponsePart);

          // ⬇️ [로그 추가] 3-1. 2차 요청에 포함될 전체 contents 확인
          this.logger.log(
            `[Gemini Request] 2차 요청 contents 개수: ${requestData.contents.length}`,
          );
          this.logger.debug(
            `[Gemini Request] 2차 요청 전체 requestData: ${JSON.stringify(requestData, null, 2)}`,
          );

          // ⬇️ [로그 추가] 4. 함수 결과를 포함하여 두 번째 API 요청
          this.logger.log(
            `[Gemini Request] 함수 실행 결과를 포함하여 2차 API 요청...`,
          );

          // Make second API call with function result
          response = await firstValueFrom(
            this.httpService.post<GeminiApiResponse>(apiUrl, requestData, {
              headers: {
                'Content-Type': 'application/json',
              },
            }),
          );

          // ⬇️ [로그 추가] 4-1. 2차 응답 확인
          this.logger.log(
            `[Gemini Response] 2차 응답 받음. candidates 개수: ${response.data.candidates?.length}`,
          );
          this.logger.debug(
            `[Gemini Response] 2차 응답 전체 데이터: ${JSON.stringify(response.data, null, 2)}`,
          );
        } else {
          // ⬇️ [로그 추가] 함수 실행되지 않음
          this.logger.warn(
            `[Function Execution] functionResult가 undefined - 함수가 실행되지 않았거나 조건 불충족`,
          );
        }
      }

      const finalCandidate = response.data.candidates[0];
      const finalPart = finalCandidate.content.parts[0];

      // ⬇️ [로그 추가] 5-0. 최종 응답 part 타입 확인
      this.logger.log(
        `[Gemini Final Response] 최종 part 타입 - text 존재: ${!!(finalPart as any).text}, functionCall 존재: ${!!(finalPart as any).functionCall}`,
      );

      const responseText = (finalPart as any).text;

      if (!responseText) {
        this.logger.error(
          `[Gemini Final Response] 최종 응답에 text가 없음! finalPart: ${JSON.stringify(finalPart)}`,
        );
        throw new InternalServerErrorException(
          'AI Assistant returned invalid response format',
        );
      }

      // ⬇️ [로그 추가] 5. Gemini의 최종 텍스트 응답
      this.logger.log(
        `[Gemini Final Response] 최종 텍스트 응답 (첫 100자): ${responseText.substring(0, 100)}...`,
      );

      const unsafeHtml = await marked.parse(responseText);
      const safeHtml = sanitizeHtml.default(unsafeHtml);
      requestAssistanceDto.response = safeHtml;
      return requestAssistanceDto;
    } catch (error) {
      // 🚨 여기가 수정된 catch 블록입니다 🚨
      this.logger.error(
        'Failed to get response from Gemini API',
        error.response?.data || error.message,
      );

      // AxiosError (HTTP 오류)인지 확인합니다.
      if (error instanceof AxiosError && error.response) {
        const status = error.response.status;

        // 503 (Overloaded) 또는 429 (Rate Limit / 너무 많은 요청) 오류인 경우
        if (status === 503 || status === 429) {
          // 500 대신 "서비스 사용 불가 (503)" 예외를 발생시킵니다.
          throw new ServiceUnavailableException(
            'AI Assistant is temporarily overloaded. Please try again later.',
          );
        }
      }

      // 위 경우가 아닌 다른 모든 오류는 기존처럼 500 (서버 내부 오류)으로 처리합니다.
      throw new InternalServerErrorException('AI Assistant API request failed');
    }
  }

  private async getTodos(
    userSeq: number,
    status?: string,
    days?: number,
  ): Promise<any> {
    // ⬇️ [로그 추가] A. getTodos 함수 시작
    this.logger.log(
      `[getTodos] 함수 시작. userSeq: ${userSeq}, status: ${status}, days: ${days}`,
    );

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

      // ⬇️ [로그 추가] B. targetDate 계산 완료
      this.logger.log(
        `[getTodos] targetDate 계산됨: ${targetDate} (days: ${days})`,
      );

      // Get todos using existing TodoService method
      const todos = await this.todoService.findAll(userSeq, targetDate);

      // ⬇️ [로그 추가] C. DB에서 데이터 조회 완료
      this.logger.log(
        `[getTodos] todoService.findAll(${userSeq}, ${targetDate}) 결과: 총 ${todos.length}개`,
      );

      // Filter todos based on status parameter
      let filteredTodos = todos;
      
      // 'overdue' 기준 날짜를 명확히 하기 위해 "오늘"의 0시 0분 0초를 기준으로 설정
      const todayOnlyDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );

      if (status) {
        filteredTodos = todos.filter((todo) => {
          const todoDate = new Date(todo.todoDate);
          const isCompleted = todo.completeDtm !== null;
          
          // 지연(overdue) 기준: 완료되지 않았고, 날짜가 "오늘" 0시 0분보다 이전인가?
          const isOverdue = !isCompleted && todoDate < todayOnlyDate;

          // ⬇️⬇️ 여기가 수정된 지점입니다 ⬇️⬇️
          switch (status) {
            case 'completed':
              return isCompleted;

            // "incomplete" (미완료) 요청 시, 완료되지 않은 모든 것 (미완료 + 지연)을 반환
            case 'incomplete':
              return !isCompleted; 

            case 'overdue':
              return isOverdue;

            default:
              return true;
          }
          // ⬆⬆⬆ 여기가 수정된 지점입니다 ⬆⬆⬆
        });

        // ⬇️ [로그 추가] D. 상태값으로 필터링 완료
        this.logger.log(
          `[getTodos] status='${status}' 필터링 결과: ${filteredTodos.length}개`,
        );
      }

      // Return structured data suitable for AI context
      const result = {
        totalCount: filteredTodos.length,
        todos: filteredTodos.map((todo) => ({
          todoSeq: todo.todoSeq,
          todoContent: todo.todoContent,
          todoDate: todo.todoDate,
          todoNote: todo.todoNote,
          completeDtm: todo.completeDtm,
          isCompleted: todo.completeDtm !== null,
          // isOverdue 계산도 수정된 기준(todayOnlyDate)을 따르도록 통일
          isOverdue:
            todo.completeDtm === null &&
            new Date(todo.todoDate) < todayOnlyDate,
        })),
        queryParams: {
          status,
          days,
          targetDate,
        },
      };

      // ⬇️ [로그 추가] E. 최종 결과 반환 직전
      this.logger.log(
        `[getTodos] 최종 반환 데이터 (요약): totalCount: ${result.totalCount}, queryParams: ${JSON.stringify(result.queryParams)}`,
      );

      return result;
    } catch (error) {
      // ⬇️ [로그 추가] F. getTodos 함수에서 오류 발생
      this.logger.error('[getTodos] 함수 실행 중 오류 발생', error);
      // Gemini에게 오류를 반환할 때는 500 예외 대신 구조화된 JSON을 반환하는 것이 더 좋습니다.
      // throw new InternalServerErrorException('Failed to retrieve todo data');
      return {
        success: false,
        error: 'Failed to retrieve todo data',
        totalCount: 0,
        todos: [],
      };
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
    // ⬇️ [로그 추가] createTodo 함수 시작
    this.logger.log(
      `[createTodo] 함수 시작. userSeq: ${userSeq}, todoContent: "${todoContent}", todoDate: ${todoDate}, todoNote: ${todoNote}`,
    );

    try {
      // Validate todoDate format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(todoDate)) {
        this.logger.warn(
          `[createTodo] 날짜 형식 오류: ${todoDate} (YYYY-MM-DD 형식 필요)`,
        );
        return {
          success: false,
          error:
            'Invalid date format. Please use YYYY-MM-DD format (e.g., 2024-12-31)',
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
      this.logger.log(`[createTodo] todoService.create 호출 중...`);
      const createdTodo = await this.todoService.create(
        user,
        ip,
        createTodoDto,
      );

      // ⬇️ [로그 추가] 생성 성공
      this.logger.log(
        `[createTodo] Todo 생성 성공. todoSeq: ${createdTodo.todoSeq}`,
      );

      // Return structured success response
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
      };

      this.logger.log(
        `[createTodo] 최종 반환 데이터: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      this.logger.error('[createTodo] 함수 실행 중 오류 발생', error);
      return {
        success: false,
        error: 'Failed to create TODO item. Please try again.',
      };
    }
  }

  /**
   * Updates an existing TODO item for the user
   * @param userSeq - User sequence number identifying the user
   * @param ip - Client IP address for audit logging
   * @param todoSeq - TODO sequence number identifying the TODO to update
   * @param updateData - Object containing optional fields to update (partial update)
   * @returns Structured response with success status and updated TODO data
   */
  private async updateTodo(
    userSeq: number,
    ip: string,
    todoSeq: number,
    updateData: {
      todoContent?: string;
      completeDtm?: string | null;
      todoNote?: string;
    },
  ): Promise<any> {
    // ⬇️ [로그 추가] updateTodo 함수 시작
    this.logger.log(
      `[updateTodo] 함수 시작. userSeq: ${userSeq}, todoSeq: ${todoSeq}, updateData: ${JSON.stringify(updateData)}`,
    );

    try {
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

      // Create UpdateTodoDto with only provided fields (partial update)
      const updateTodoDto: any = {};
      if (updateData.todoContent !== undefined) {
        updateTodoDto.todoContent = updateData.todoContent;
      }
      if (updateData.completeDtm !== undefined) {
        updateTodoDto.completeDtm = updateData.completeDtm;
      }
      if (updateData.todoNote !== undefined) {
        updateTodoDto.todoNote = updateData.todoNote;
      }

      // ⬇️ [로그 추가] updateTodoDto 확인
      this.logger.log(
        `[updateTodo] updateTodoDto: ${JSON.stringify(updateTodoDto)}`,
      );

      // Call TodoService to update the TODO
      this.logger.log(`[updateTodo] todoService.update 호출 중...`);
      const updatedTodo = await this.todoService.update(
        todoSeq,
        user,
        ip,
        updateTodoDto,
      );

      // Handle "not found" case explicitly
      if (!updatedTodo) {
        this.logger.warn(
          `[updateTodo] Todo를 찾을 수 없거나 접근 권한 없음. todoSeq: ${todoSeq}`,
        );
        return {
          success: false,
          error: 'TODO item not found or access denied',
        };
      }

      // ⬇️ [로그 추가] 수정 성공
      this.logger.log(
        `[updateTodo] Todo 수정 성공. todoSeq: ${updatedTodo.todoSeq}`,
      );

      // Return structured success response with updated TODO data
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
      };

      this.logger.log(
        `[updateTodo] 최종 반환 데이터: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      this.logger.error('[updateTodo] 함수 실행 중 오류 발생', error);
      return {
        success: false,
        error: 'Failed to update TODO item. Please try again.',
      };
    }
  }
}
