import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, Between } from 'typeorm';
import { TodoEntity } from './todo.entity';
import { 
  CreateTodoDto, 
  UpdateTodoDto, 
  CreateTodoWithFilesDto,
  TodoWithFilesResponseDto,
  FileAttachmentResponseDto,
  FileUploadResponseDto
} from './todo.dto';
import { setAuditColumn, AuditSettings } from '../utils/auditColumns';
import { UserEntity } from '../user/user.entity';
import { FileInfoEntity } from '../fileUpload/file.entity';
import { FileUploadUtil } from '../fileUpload/fileUploadUtil';
import * as ExcelJS from 'exceljs';
import { format, addDays } from 'date-fns';

@Injectable()
export class TodoService {
  constructor(
    // TodoEntity의 Repository를 주입합니다.
    @InjectRepository(TodoEntity)
    private todoRepository: Repository<TodoEntity>,
    // FileInfoEntity의 Repository를 주입합니다.
    @InjectRepository(FileInfoEntity)
    private fileInfoRepository: Repository<FileInfoEntity>,
    // FileUploadUtil을 주입합니다.
    private fileUploadUtil: FileUploadUtil,
  ) {}

  // 특정 사용자의 특정 날짜의 모든 ToDo 항목을 조회합니다.
  async findAll(userSeq: number, todoDate: string): Promise<TodoEntity[]> {
    // 날짜 범위 계산
    const startOfDay = `${todoDate} 00:00:00`;
    const nextDayStr = format(addDays(new Date(todoDate), 1), 'yyyy-MM-dd') + ' 00:00:00';

    // 1. 쿼리 빌더 생성
    const qb = this.todoRepository.createQueryBuilder('todo');

    // 2. 기본 WHERE 조건 설정 (공통 조건)
    qb.where('todo.delYn = :delYn', { delYn: 'N' })
      .andWhere('todo.userSeq = :userSeq', { userSeq });

    // 3. 세 가지 OR 조건을 괄호(Brackets)로 묶기
    qb.andWhere(new Brackets(subQuery => {
      
      // 조건 1: 미완료 항목 (todoDate <= :todoDate AND completeDtm IS NULL)
      subQuery.where(new Brackets(c1 => {
        c1.where('todo.todoDate <= :todoDate', { todoDate })
          .andWhere('todo.completeDtm IS NULL');
      }));

      // 조건 2: 완료 항목 (todoDate = :todoDate AND completeDtm IS NOT NULL)
      subQuery.orWhere(new Brackets(c2 => {
        c2.where('todo.todoDate = :todoDate', { todoDate })
          .andWhere('todo.completeDtm IS NOT NULL');
      }));

      // 조건 3: 오늘 완료한 항목 (completeDtm >= :startOfDay AND completeDtm < :nextDayStr)
      subQuery.orWhere(new Brackets(c3 => {
        c3.where('todo.completeDtm >= :startOfDay', { startOfDay })
          .andWhere('todo.completeDtm < :nextDayStr', { nextDayStr });
      }));
    }));

    // 4. 정렬 순서 적용
    qb.orderBy('todo.completeDtm', 'DESC', 'NULLS FIRST')
      .addOrderBy('todo.todoSeq', 'DESC');

    // 5. 쿼리 실행
    return qb.getMany();
  }

  // 새로운 ToDo 항목을 생성합니다.
  async create(
    user: Omit<UserEntity, 'userPassword'>,
    ip: string,
    createTodoDto: CreateTodoDto,
  ): Promise<TodoEntity> {
    const newTodo = this.todoRepository.create({
      ...createTodoDto,
      userSeq: user.userSeq, // 사용자 번호를 설정합니다.
    });
    const auditSettings: AuditSettings = {
      ip,
      entity: newTodo,
      id: user.userId,
    };
    setAuditColumn(auditSettings);

    return this.todoRepository.save(newTodo);
  }

  // 특정 ToDo 항목을 수정합니다.
  async update(
    id: number,
    user: Omit<UserEntity, 'userPassword'>,
    ip: string,
    updateTodoDto: UpdateTodoDto,
  ): Promise<TodoEntity> {
    const todo = await this.todoRepository.findOne({
      where: { todoSeq: id, userSeq: user.userSeq },
    });
    if (!todo) {
      // ToDo 항목이 없으면 null을 반환합니다.
      return null;
    }

    // 수정된 내용을 적용합니다.
    Object.assign(todo, updateTodoDto);
    const auditSettings: AuditSettings = {
      ip,
      entity: todo,
      id: user.userId,
      isUpdate: true,
    };
    setAuditColumn(auditSettings);

    return this.todoRepository.save(todo);
  }

  // 특정 ToDo 항목을 삭제 (soft delete)합니다.
  async delete(
    user: Omit<UserEntity, 'userPassword'>,
    ip: string,
    todoId: number,
  ): Promise<void> {
    const todoToDelete = await this.todoRepository.findOne({
      where: {
        todoSeq: todoId,
        userSeq: user.userSeq,
      },
    });

    if (todoToDelete) {
      todoToDelete.delYn = 'Y';
      setAuditColumn({
        ip,
        entity: todoToDelete,
        id: user.userId,
        isUpdate: true,
      });
      await this.todoRepository.save(todoToDelete);
    }
  }

  // 파일 첨부만 업로드합니다 (독립적인 파일 업로드)
  async uploadAttachments(
    user: Omit<UserEntity, 'userPassword'>,
    ip: string,
    files: Express.Multer.File[],
  ): Promise<FileUploadResponseDto> {
    if (!files || files.length === 0) {
      return {
        success: false,
        uploadedFiles: [],
        message: 'No files provided for upload',
      };
    }

    const auditSettings: AuditSettings = {
      ip,
      entity: null, // Will be set in saveFileInfo
      id: user.userId,
    };

    try {
      const { savedFiles, fileGroupNo } = await this.fileUploadUtil.saveFileInfo(
        files,
        auditSettings,
        'todo_attachment',
      );

      const attachmentResponses: FileAttachmentResponseDto[] = savedFiles.map(file => ({
        fileNo: file.fileNo,
        originalFileName: file.originalFileName,
        fileSize: file.fileSize,
        fileExt: file.fileExt,
        uploadDate: file.auditColumns.regDtm.toISOString(),
        validationStatus: file.validationStatus,
      }));

      return {
        success: true,
        uploadedFiles: attachmentResponses,
        fileGroupNo,
        message: `Successfully uploaded ${savedFiles.length} file(s)`,
      };
    } catch (error) {
      return {
        success: false,
        uploadedFiles: [],
        message: `File upload failed: ${error.message}`,
      };
    }
  }

  // 파일과 함께 새로운 TODO 항목을 생성합니다.
  async createWithFiles(
    user: Omit<UserEntity, 'userPassword'>,
    ip: string,
    createTodoDto: CreateTodoWithFilesDto,
    files: Express.Multer.File[],
  ): Promise<TodoWithFilesResponseDto> {
    // 먼저 TODO 항목을 생성합니다.
    const newTodo = await this.create(user, ip, createTodoDto);

    let attachments: FileAttachmentResponseDto[] = [];
    let fileGroupNo: number | null = null;

    // 파일이 있는 경우 파일을 업로드하고 TODO와 연결합니다.
    if (files && files.length > 0) {
      const auditSettings: AuditSettings = {
        ip,
        entity: null, // Will be set in saveFileInfo
        id: user.userId,
      };

      try {
        const { savedFiles, fileGroupNo: uploadedFileGroupNo } = await this.fileUploadUtil.saveFileInfo(
          files,
          auditSettings,
          'todo_attachment',
        );

        fileGroupNo = uploadedFileGroupNo;

        // TODO 항목에 파일 그룹 번호를 연결합니다.
        newTodo.todoFileGroupNo = fileGroupNo;
        await this.todoRepository.save(newTodo);

        attachments = savedFiles.map(file => ({
          fileNo: file.fileNo,
          originalFileName: file.originalFileName,
          fileSize: file.fileSize,
          fileExt: file.fileExt,
          uploadDate: file.auditColumns.regDtm.toISOString(),
          validationStatus: file.validationStatus,
        }));
      } catch (error) {
        // 파일 업로드 실패 시에도 TODO는 생성된 상태로 유지
        console.error('File upload failed during TODO creation:', error);
      }
    }

    return {
      todoSeq: newTodo.todoSeq,
      todoContent: newTodo.todoContent,
      todoDate: newTodo.todoDate,
      todoNote: newTodo.todoNote,
      completeDtm: newTodo.completeDtm,
      attachments,
      createdAt: newTodo.auditColumns.regDtm.toISOString(),
    };
  }

  // 기존 TODO 항목에 파일을 추가합니다.
  async addAttachments(
    todoId: number,
    user: Omit<UserEntity, 'userPassword'>,
    ip: string,
    files: Express.Multer.File[],
  ): Promise<FileUploadResponseDto> {
    // TODO 항목이 존재하고 사용자 소유인지 확인합니다.
    const todo = await this.todoRepository.findOne({
      where: { todoSeq: todoId, userSeq: user.userSeq, delYn: 'N' },
    });

    if (!todo) {
      return {
        success: false,
        uploadedFiles: [],
        message: 'TODO item not found or access denied',
      };
    }

    if (!files || files.length === 0) {
      return {
        success: false,
        uploadedFiles: [],
        message: 'No files provided for upload',
      };
    }

    const auditSettings: AuditSettings = {
      ip,
      entity: null, // Will be set in saveFileInfo
      id: user.userId,
    };

    try {
      let fileGroupNo = todo.todoFileGroupNo;

      // TODO에 기존 파일 그룹이 없는 경우 새로 생성
      if (!fileGroupNo) {
        const { savedFiles, fileGroupNo: newFileGroupNo } = await this.fileUploadUtil.saveFileInfo(
          files,
          auditSettings,
          'todo_attachment',
        );

        fileGroupNo = newFileGroupNo;
        todo.todoFileGroupNo = fileGroupNo;
        await this.todoRepository.save(todo);

        const attachmentResponses: FileAttachmentResponseDto[] = savedFiles.map(file => ({
          fileNo: file.fileNo,
          originalFileName: file.originalFileName,
          fileSize: file.fileSize,
          fileExt: file.fileExt,
          uploadDate: file.auditColumns.regDtm.toISOString(),
          validationStatus: file.validationStatus,
        }));

        return {
          success: true,
          uploadedFiles: attachmentResponses,
          fileGroupNo,
          message: `Successfully added ${savedFiles.length} file(s) to TODO`,
        };
      } else {
        // 기존 파일 그룹에 파일 추가
        const savedFiles: FileInfoEntity[] = [];

        for (const file of files) {
          let newFile = this.fileInfoRepository.create({
            fileGroupNo: fileGroupNo,
            filePath: file.path,
            saveFileName: file.filename,
            originalFileName: file.originalname,
            fileExt: file.originalname.split('.').pop() || '',
            fileSize: file.size,
            fileCategory: 'todo_attachment',
            validationStatus: 'validated',
          });

          auditSettings.entity = newFile;
          newFile = setAuditColumn(auditSettings);

          const savedFile = await this.fileInfoRepository.save(newFile);
          savedFiles.push(savedFile);
        }

        const attachmentResponses: FileAttachmentResponseDto[] = savedFiles.map(file => ({
          fileNo: file.fileNo,
          originalFileName: file.originalFileName,
          fileSize: file.fileSize,
          fileExt: file.fileExt,
          uploadDate: file.auditColumns.regDtm.toISOString(),
          validationStatus: file.validationStatus,
        }));

        return {
          success: true,
          uploadedFiles: attachmentResponses,
          fileGroupNo,
          message: `Successfully added ${savedFiles.length} file(s) to existing TODO`,
        };
      }
    } catch (error) {
      return {
        success: false,
        uploadedFiles: [],
        message: `File upload failed: ${error.message}`,
      };
    }
  }

  // TODO 항목의 첨부 파일 목록을 조회합니다.
  async getAttachments(
    todoId: number,
    userSeq: number,
  ): Promise<FileAttachmentResponseDto[]> {
    // TODO 항목이 존재하고 사용자 소유인지 확인합니다.
    const todo = await this.todoRepository.findOne({
      where: { todoSeq: todoId, userSeq: userSeq, delYn: 'N' },
    });

    if (!todo || !todo.todoFileGroupNo) {
      return [];
    }

    // 파일 그룹에 속한 모든 파일을 조회합니다.
    const files = await this.fileInfoRepository.find({
      where: { 
        fileGroupNo: todo.todoFileGroupNo,
        fileCategory: 'todo_attachment',
      },
      order: { fileNo: 'ASC' },
    });

    return files.map(file => ({
      fileNo: file.fileNo,
      originalFileName: file.originalFileName,
      fileSize: file.fileSize,
      fileExt: file.fileExt,
      uploadDate: file.auditColumns.regDtm.toISOString(),
      validationStatus: file.validationStatus,
    }));
  }

  // TODO 항목을 Excel 파일로 내보냅니다.
  async exportToExcel(
    userSeq: number,
    startDate: string,
    endDate: string,
  ): Promise<Buffer> {
    // 입력 검증: startDate와 endDate가 제공되었는지 확인
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required');
    }

    // 날짜 형식 검증 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }

    // 날짜 범위 내의 삭제되지 않은 TODO 항목을 조회합니다.
    const todos = await this.todoRepository.find({
      where: {
        userSeq,
        todoDate: Between(startDate, endDate),
        delYn: 'N',
      },
      order: {
        todoDate: 'ASC',
        todoSeq: 'ASC',
      },
    });

    // 새로운 Excel 워크북과 워크시트를 생성합니다.
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Todos');

    // Excel 행 높이 상수
    const ROW_HEIGHT = 15;

    // 열 너비를 설정합니다.
    worksheet.getColumn('A').width = 4;  // Column A는 비어있음 (visible but empty)
    worksheet.getColumn('B').width = 6;  // 번호
    worksheet.getColumn('C').width = 80; // 내용
    worksheet.getColumn('D').width = 17; // 완료일시
    worksheet.getColumn('E').width = 90; // 비고

    // Row 1은 비워둡니다 (이미 기본적으로 비어있음)
    // Row 1의 높이를 설정합니다.
    worksheet.getRow(1).height = ROW_HEIGHT;

    // Row 2에 헤더를 추가합니다.
    const headerRow = worksheet.getRow(2);
    headerRow.height = ROW_HEIGHT; // 헤더 행의 높이를 설정합니다.
    headerRow.getCell('B').value = '번호';
    headerRow.getCell('C').value = '내용';
    headerRow.getCell('D').value = '완료일시';
    headerRow.getCell('E').value = '비고';

    // 헤더 스타일을 적용합니다.
    ['B', 'C', 'D', 'E'].forEach(col => {
      const cell = headerRow.getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }, // 밝은 회색 배경
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.font = {
        bold: true,
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
    });

    // Row 3부터 데이터를 채웁니다.
    todos.forEach((todo, index) => {
      const rowNumber = index + 3;
      const dataRow = worksheet.getRow(rowNumber);
      dataRow.height = ROW_HEIGHT; // 데이터 행의 높이를 설정합니다.

      dataRow.getCell('B').value = todo.todoSeq;
      dataRow.getCell('B').alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
      dataRow.getCell('C').value = todo.todoContent || '';
      
      // completeDtm을 "YYYY-MM-DD HH:mm" 형식으로 포맷합니다.
      if (todo.completeDtm) {
        const completeDtm = new Date(todo.completeDtm);
        dataRow.getCell('D').value = format(completeDtm, 'yyyy-MM-dd HH:mm');
        dataRow.getCell('D').alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };
      } else {
        dataRow.getCell('D').value = '';
      }
      
      dataRow.getCell('E').value = todo.todoNote || '';
    });

    // 워크북을 버퍼로 변환하여 반환합니다.
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
