import {
  Repository,
  DataSource,
  Brackets,
  Between,
  EntityManager,
} from 'typeorm';
import { TodoEntity } from './todo.entity';
import { FileInfoEntity } from '../../fileUpload/file.entity';
import { FileUploadUtil } from '../../fileUpload/fileUploadUtil';
import { CloudinaryService } from '../../fileUpload/cloudinary.service';
import { setAuditColumn } from '../../utils/auditColumns';
import { CreateTodoDto, UpdateTodoDto, SearchTodoDto } from './todo.schema'; // 스키마에서 타입 import
import { format, addDays } from 'date-fns';
import * as ExcelJS from 'exceljs';

export class TodoService {
  private readonly todoRepository: Repository<TodoEntity>;
  private readonly fileInfoRepository: Repository<FileInfoEntity>;
  private readonly fileUploadUtil: FileUploadUtil;

  constructor(
    private readonly dataSource: DataSource,
    private readonly cloudinaryService: CloudinaryService,
  ) {
    this.todoRepository = dataSource.getRepository(TodoEntity);
    this.fileInfoRepository = dataSource.getRepository(FileInfoEntity);
    this.fileUploadUtil = new FileUploadUtil(
      this.fileInfoRepository,
      cloudinaryService,
    );
  }

  async findAll(
    userSeq: number,
    todoDate: string | null,
  ): Promise<TodoEntity[]> {
    const qb = this.todoRepository.createQueryBuilder('todo');

    qb.where('todo.delYn = :delYn', { delYn: 'N' }).andWhere(
      'todo.userSeq = :userSeq',
      { userSeq },
    );

    if (todoDate) {
      const startOfDay = `${todoDate} 00:00:00`;
      const nextDayStr = `${format(addDays(new Date(todoDate), 1), 'yyyy-MM-dd')} 00:00:00`;

      qb.andWhere(
        new Brackets((subQuery) => {
          subQuery.where(
            new Brackets((c1) => {
              c1.where('todo.todoDate <= :todoDate', { todoDate }).andWhere(
                'todo.completeDtm IS NULL',
              );
            }),
          );

          subQuery.orWhere(
            new Brackets((c2) => {
              c2.where('todo.todoDate = :todoDate', { todoDate }).andWhere(
                'todo.completeDtm IS NOT NULL',
              );
            }),
          );

          subQuery.orWhere(
            new Brackets((c3) => {
              c3.where('todo.completeDtm >= :startOfDay', {
                startOfDay,
              }).andWhere('todo.completeDtm < :nextDayStr', { nextDayStr });
            }),
          );
        }),
      );
    }

    qb.orderBy('todo.completeDtm', 'DESC', 'NULLS FIRST').addOrderBy(
      'todo.todoSeq',
      'DESC',
    );

    return qb.getMany();
  }

  async search(userSeq: number, query: SearchTodoDto): Promise<TodoEntity[]> {
    const { startDate, endDate, keyword } = query;
    const qb = this.todoRepository
      .createQueryBuilder('todo')
      .where('todo.userSeq = :userSeq', { userSeq })
      .andWhere('todo.delYn = :delYn', { delYn: 'N' })
      .andWhere('todo.todoDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (keyword) {
      qb.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(todo.todoContent) LIKE LOWER(:keyword)', {
            keyword: `%${keyword}%`,
          }).orWhere('LOWER(todo.todoNote) LIKE LOWER(:keyword)', {
            keyword: `%${keyword}%`,
          });
        }),
      );
    }

    return qb
      .orderBy('todo.todoDate', 'DESC')
      .addOrderBy('todo.todoSeq', 'DESC')
      .getMany();
  }

  // create와 createWithFiles 통합
  async create(
    userSeq: number,
    ip: string,
    dto: CreateTodoDto,
  ): Promise<TodoEntity> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const newTodo = manager.create(TodoEntity, {
        userSeq,
        todoContent: dto.todoContent,
        todoDate: dto.todoDate,
        todoNote: dto.todoNote,
      });

      // 감사 정보 설정 (Audit)
      setAuditColumn({
        entity: newTodo,
        id: String(userSeq),
        ip,
        isUpdate: false,
      });

      const savedTodo = await manager.save(newTodo);

      // 파일 업로드 처리
      if (dto.files && Array.isArray(dto.files) && dto.files.length > 0) {
        // files가 File[] 인지 확인 (Elysia t.Files는 File[])
        const files = dto.files;

        const { fileGroupNo } = await this.fileUploadUtil.saveFileInfo(
          files,
          { entity: null, id: String(userSeq), ip, isUpdate: false },
          manager,
        );

        if (fileGroupNo) {
          savedTodo.todoFileGroupNo = fileGroupNo;
          await manager.save(savedTodo);
        }
      }

      return savedTodo;
    });
  }

  async update(
    todoSeq: number,
    userSeq: number,
    ip: string,
    dto: UpdateTodoDto,
  ): Promise<TodoEntity> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const todo = await manager.findOne(TodoEntity, {
        where: { todoSeq, userSeq, delYn: 'N' },
      });
      if (!todo) throw new Error('Todo not found');

      // 내용 수정
      if (dto.todoContent !== undefined) todo.todoContent = dto.todoContent;
      if (dto.todoDate !== undefined) todo.todoDate = dto.todoDate;
      if (dto.todoNote !== undefined) todo.todoNote = dto.todoNote;
      if (dto.completeDtm !== undefined) {
        // completeDtm 처리 (DB 타입에 맞춰)
        todo.completeDtm = dto.completeDtm ? new Date(dto.completeDtm) : null;
      }

      // 파일 추가 업로드
      if (dto.files && Array.isArray(dto.files) && dto.files.length > 0) {
        const files = dto.files;
        await this.processFileUpload(manager, userSeq, ip, files, todo);
      }

      setAuditColumn({
        entity: todo,
        id: String(userSeq),
        ip,
        isUpdate: true,
      });

      return manager.save(todo);
    });
  }

  async delete(todoIds: number[], userSeq: number, ip: string): Promise<void> {
    // 일괄 삭제
    const todos = await this.todoRepository.find({
      where: todoIds.map((id) => ({ todoSeq: id, userSeq })),
    });

    if (todos.length === 0) return;

    for (const todo of todos) {
      todo.delYn = 'Y';
      setAuditColumn({
        entity: todo,
        id: String(userSeq),
        ip,
        isUpdate: true,
      });
    }
    await this.todoRepository.save(todos);
  }

  // 첨부파일 삭제
  async deleteAttachment(
    todoSeq: number,
    fileNo: number,
    userSeq: number,
  ): Promise<void> {
    const todo = await this.todoRepository.findOne({
      where: { todoSeq, userSeq, delYn: 'N' },
    });
    if (!todo?.todoFileGroupNo)
      throw new Error('Todo not found or has no files');

    const fileInfo = await this.fileInfoRepository.findOne({
      where: { fileNo, fileGroupNo: todo.todoFileGroupNo },
    });
    if (!fileInfo) throw new Error('File not found');

    // Cloudinary 삭제
    if (fileInfo.filePath?.includes('cloudinary')) {
      const publicId = this.cloudinaryService.extractPublicIdFromUrl(
        fileInfo.filePath,
      );
      // resourceType 추론
      let resourceType = 'image';
      const ext = fileInfo.fileExt.toLowerCase();
      if (['pdf', 'txt', 'csv'].includes(ext)) {
        resourceType = 'raw';
      } else if (['mp4', 'avi', 'mov'].includes(ext)) {
        resourceType = 'video';
      }
      await this.cloudinaryService.deleteFile(publicId, resourceType);
    }

    await this.fileInfoRepository.remove(fileInfo);
  }

  // 첨부파일 목록 조회
  async getAttachments(
    todoSeq: number,
    userSeq: number,
  ): Promise<
    {
      fileNo: number;
      originalFileName: string;
      fileSize: number;
      fileExt: string;
      uploadDate: Date;
    }[]
  > {
    const todo = await this.todoRepository.findOne({
      where: { todoSeq, userSeq, delYn: 'N' },
    });
    if (!todo?.todoFileGroupNo) return [];

    const files = await this.fileInfoRepository.find({
      where: { fileGroupNo: todo.todoFileGroupNo },
      order: { fileNo: 'ASC' },
    });

    return files.map((file) => ({
      fileNo: file.fileNo,
      originalFileName: file.originalFileName,
      fileSize: file.fileSize,
      fileExt: file.fileExt,
      uploadDate: file.auditColumns.regDtm,
    }));
  }

  async exportToExcel(
    userSeq: number,
    startDate: string,
    endDate: string,
  ): Promise<Buffer> {
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required');
    }

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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Todos');
    const ROW_HEIGHT = 15;

    worksheet.getColumn('B').width = 6;
    worksheet.getColumn('C').width = 80;
    worksheet.getColumn('D').width = 17;
    worksheet.getColumn('E').width = 90;

    worksheet.getRow(1).height = ROW_HEIGHT;

    const headerRow = worksheet.getRow(2);
    headerRow.height = ROW_HEIGHT;
    headerRow.getCell('B').value = '번호';
    headerRow.getCell('C').value = '내용';
    headerRow.getCell('D').value = '완료일시';
    headerRow.getCell('E').value = '비고';

    ['B', 'C', 'D', 'E'].forEach((col) => {
      const cell = headerRow.getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { bold: true };
    });

    todos.forEach((todo, index) => {
      const rowNumber = index + 3;
      const dataRow = worksheet.getRow(rowNumber);
      dataRow.height = ROW_HEIGHT;

      dataRow.getCell('B').value = todo.todoSeq;
      dataRow.getCell('C').value = todo.todoContent || '';

      if (todo.completeDtm) {
        dataRow.getCell('D').value = format(
          new Date(todo.completeDtm),
          'yyyy-MM-dd HH:mm',
        );
      } else {
        dataRow.getCell('D').value = '';
      }

      dataRow.getCell('E').value = todo.todoNote || '';
    });

    // 반환을 위해 버퍼 타입 변환
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async processFileUpload(
    manager: EntityManager,
    userSeq: number,
    ip: string,
    files: File[],
    todo: TodoEntity,
  ) {
    const { savedFiles, fileGroupNo } = await this.fileUploadUtil.saveFileInfo(
      files,
      { entity: null, id: String(userSeq), ip, isUpdate: false },
      manager,
    );

    if (todo.todoFileGroupNo) {
      if (fileGroupNo !== todo.todoFileGroupNo) {
        const fileRepo = manager.getRepository(FileInfoEntity);
        for (const f of savedFiles) {
          f.fileGroupNo = todo.todoFileGroupNo;
          await fileRepo.save(f);
        }
      }
    } else {
      todo.todoFileGroupNo = fileGroupNo;
    }
  }
}
