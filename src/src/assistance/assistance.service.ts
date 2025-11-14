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
    private readonly keychainUtil: KeychainUtil,
    private readonly todoService: TodoService,
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
  ): Promise<{ success: boolean; todoSeq?: number; matches?: number; error?: string }> {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const allTodos = await this.todoService.findAll(userSeq, currentDate);
      
      const matches = allTodos.filter(todo => 
        todo.todoContent.toLowerCase().includes(contentToFind.toLowerCase())
      );
      
      if (matches.length === 0) {
        return { success: false, error: '일치하는 할 일을 찾을 수 없습니다.' };
      }
      
      if (matches.length > 1) {
        return { 
          success: false, 
          matches: matches.length,
          error: `"${contentToFind}"와 일치하는 할 일이 ${matches.length}개 있습니다. 더 구체적으로 지정해주세요.` 
        };
      }
      
      return { success: true, todoSeq: matches[0].todoSeq };
    } catch (error) {
      this.logger.error('[findTodoByContent] 검색 중 오류 발생', error);
      return { success: false, error: '할 일 검색에 실패했습니다.' };
    }
  }

  /**
   * 모듈 초기화 시 실행
   * 키체인에서 API 키를 불러와 복호화 후 저장
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

    }
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
      
      if (userName) {
        systemPrompt = systemPrompt.replace(/\[사용자 이름\]/g, userName);
      }

      const currentDate = this.getCurrentKSTDate();
      const dateContext = `\n\n[CURRENT_DATE]\n오늘 날짜: ${currentDate} (YYYY-MM-DD 형식)\n이 날짜를 기준으로 "오늘", "내일", "다음 주" 등의 상대적 날짜를 계산하세요.`;
      systemPrompt = systemPrompt + dateContext;
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
          headers: {
            'Content-Type': 'application/json',
          },
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

      this.logger.log(
        `[Gemini Response] firstPart 타입 확인 - functionCall 존재: ${!!firstPart.functionCall}, text 존재: ${!!firstPart.text}`,
      );

      if (firstPart.functionCall) {
        const functionCall = firstPart.functionCall;
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

        if (functionResult !== undefined) {
          this.logger.log(
            `[Gemini Function Result] ${functionCall.name} 함수 실행 결과 (Gemini에게 전송): ${JSON.stringify(functionResult)}`,
          );

          requestData.contents.push({
            parts: [candidate.content.parts[0] as any],
          });

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

          this.logger.log(
            `[Gemini Request] 2차 요청 contents 개수: ${requestData.contents.length}`,
          );
          this.logger.debug(
            `[Gemini Request] 2차 요청 전체 requestData: ${JSON.stringify(requestData, null, 2)}`,
          );

          this.logger.log(
            `[Gemini Request] 함수 실행 결과를 포함하여 2차 API 요청...`,
          );

          response = await firstValueFrom(
            this.httpService.post<GeminiApiResponse>(apiUrl, requestData, {
              headers: {
                'Content-Type': 'application/json',
              },
            }),
          );

          this.logger.log(
            `[Gemini Response] 2차 응답 받음. candidates 개수: ${response.data.candidates?.length}`,
          );
          this.logger.debug(
            `[Gemini Response] 2차 응답 전체 데이터: ${JSON.stringify(response.data, null, 2)}`,
          );
        } else {
          this.logger.warn(
            `[Function Execution] functionResult가 undefined - 함수가 실행되지 않았거나 조건 불충족`,
          );
        }
      }

      const finalCandidate = response.data.candidates[0];
      const finalPart = finalCandidate.content.parts[0];

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

      this.logger.log(
        `[Gemini Final Response] 최종 텍스트 응답 (첫 100자): ${responseText.substring(0, 100)}...`,
      );

      const unsafeHtml = await marked.parse(responseText);
      const safeHtml = sanitizeHtml.default(unsafeHtml);
      requestAssistanceDto.response = safeHtml;
      return requestAssistanceDto;
    } catch (error) {
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

      throw new InternalServerErrorException('AI 어시스턴트 API 요청이 실패했습니다');
    }
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

      if (days !== undefined) {
        const targetDateObj = new Date(today);
        targetDateObj.setDate(today.getDate() + days);
        targetDate = targetDateObj.toISOString().split('T')[0];
      } else {
        targetDate = today.toISOString().split('T')[0];
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
          todoContent: todo.todoContent,
          todoDate: todo.todoDate,
          todoNote: todo.todoNote,
          completeDtm: todo.completeDtm,
          isCompleted: todo.completeDtm !== null,
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
   * 새로운 TODO 항목 생성
   * @param userSeq - 사용자 시퀀스 번호
   * @param userId - 사용자 ID
   * @param ip - 클라이언트 IP 주소
   * @param todoContent - TODO 내용
   * @param todoDate - YYYY-MM-DD 형식의 목표 날짜
   * @param todoNote - 추가 메모
   * @returns 성공 여부와 생성된 TODO 데이터
   */
  private async createTodo(
    userSeq: number,
    userId: string,
    ip: string,
    todoContent: string,
    todoDate: string,
    todoNote?: string,
  ): Promise<any> {
    // ⬇️ [로그 추가] createTodo 함수 시작
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
      } as Omit<UserEntity, 'userPassword'>;

      const createTodoDto: CreateTodoDto = {
        todoContent,
        todoDate,
        todoNote,
      };

      this.logger.log(`[createTodo] todoService.create 호출 중...`);
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
        refreshedList: refreshedList,
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
   * 기존 TODO 항목 업데이트
   * @param userSeq - 사용자 시퀀스 번호
   * @param userId - 사용자 ID
   * @param ip - 클라이언트 IP 주소
   * @param todoSeq - TODO 시퀀스 번호
   * @param todoContentToFind - 내용 검색어
   * @param updateData - 업데이트할 필드
   * @returns 성공 여부와 업데이트된 TODO 데이터
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
        const searchResult = await this.findTodoByContent(userSeq, todoContentToFind);
        if (!searchResult.success) {
          return searchResult;
        }
        targetTodoSeq = searchResult.todoSeq;
      }
      
      if (!targetTodoSeq) {
        return { success: false, error: 'todoSeq 또는 todoContentToFind가 필요합니다.' };
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
      } as Omit<UserEntity, 'userPassword'>;

      const updateTodoDto: any = {};
      if (updateData?.todoContent !== undefined) {
        updateTodoDto.todoContent = updateData.todoContent;
      }
      if (updateData?.isCompleted !== undefined) {
        updateTodoDto.completeDtm = updateData.isCompleted ? 'NOW()' : null;
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
        refreshedList: refreshedList,
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
