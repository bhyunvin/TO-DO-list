import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { TodoEntity } from './todo.entity';
import { CreateTodoDto, UpdateTodoDto } from './todo.dto';
import { setAuditColumn } from 'src/utils/auditColumns';

@Injectable()
export class TodoService {
  private readonly logger = new Logger(TodoService.name);

  constructor(
    @InjectRepository(TodoEntity)
    private todoRepository: Repository<TodoEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // 특정 사용자의 특정 날짜의 모든 ToDo 항목을 조회합니다.
  async findAll(userSeq: number, todoDate: string): Promise<TodoEntity[]> {
    this.logger.log(`Finding all todos for user ${userSeq} on date ${todoDate}`);
    return this.todoRepository.find({
      where: {
        userSeq,
        todoDate,
        delYn: 'N', // 삭제되지 않은 항목만 조회합니다.
      },
    });
  }

  // 새로운 ToDo 항목을 생성합니다.
  async create(
    userSeq: number,
    createTodoDto: CreateTodoDto,
    userId: string,
    ip: string,
  ): Promise<TodoEntity> {
    this.logger.log(`Creating a new todo for user ${userSeq}`);
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      let newTodo = this.todoRepository.create({
        ...createTodoDto,
        userSeq, // 사용자 ID를 설정합니다.
      });
      newTodo = setAuditColumn({ entity: newTodo, id: userId, ip });
      return transactionalEntityManager.save(TodoEntity, newTodo);
    });
  }

  // 특정 ToDo 항목을 수정합니다.
  async update(
    id: number,
    userSeq: number,
    updateTodoDto: UpdateTodoDto,
    userId: string,
    ip: string,
  ): Promise<TodoEntity> {
    this.logger.log(`Updating todo ${id} for user ${userSeq}`);
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const todo = await transactionalEntityManager.findOne(TodoEntity, {
        where: { todoSeq: id, userSeq, delYn: 'N' },
      });
      if (!todo) {
        // ToDo 항목이 없으면 null을 반환합니다.
        return null;
      }

      // 수정된 내용을 적용합니다.
      Object.assign(todo, updateTodoDto);
      setAuditColumn({ entity: todo, id: userId, ip, isUpdate: true });

      return transactionalEntityManager.save(TodoEntity, todo);
    });
  }

  // 여러 ToDo 항목을 삭제 (soft delete)합니다.
  async delete(
    userSeq: number,
    todoIds: number[],
    userId: string,
    ip: string,
  ): Promise<void> {
    this.logger.log(`Deleting todos ${todoIds} for user ${userSeq}`);
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      const todos = await transactionalEntityManager.find(TodoEntity, {
        where: {
          todoSeq: In(todoIds),
          userSeq,
          delYn: 'N',
        },
      });

      for (const todo of todos) {
        todo.delYn = 'Y';
        setAuditColumn({ entity: todo, id: userId, ip, isUpdate: true });
        await transactionalEntityManager.save(TodoEntity, todo);
      }
    });
  }
}
