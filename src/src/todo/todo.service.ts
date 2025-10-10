import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, IsNull, Not } from 'typeorm';
import { TodoEntity } from './todo.entity';
import { CreateTodoDto, UpdateTodoDto } from './todo.dto';
import { setAuditColumn, AuditSettings } from '../utils/auditColumns';
import { UserEntity } from '../user/user.entity';

@Injectable()
export class TodoService {
  constructor(
    // TodoEntity의 Repository를 주입합니다.
    @InjectRepository(TodoEntity)
    private todoRepository: Repository<TodoEntity>,
  ) {}

  // 특정 사용자의 특정 날짜의 모든 ToDo 항목을 조회합니다.
  async findAll(userSeq: number, todoDate: string): Promise<TodoEntity[]> {
    return this.todoRepository.find({
      where: [
        // 1. 완료되지 않은 항목: 조회일(todoDate) 이전에 생성된 모든 미완료 항목을 포함합니다.
        {
          userSeq,
          todoDate: LessThanOrEqual(todoDate),
          completeDtm: IsNull(),
          delYn: 'N',
        },
        // 2. 완료된 항목: 정확히 조회일(todoDate)에 해당하는 완료된 항목만 포함합니다.
        {
          userSeq,
          todoDate: todoDate,
          completeDtm: Not(IsNull()),
          delYn: 'N',
        },
      ],
      order: {
        // 완료되지 않은 항목(completeDtm이 null)을 먼저, 그 다음 완료된 항목을 오름차순으로 정렬합니다.
        completeDtm: {
          direction: 'DESC',
          nulls: 'FIRST',
        },
        // 같은 조건 내에서는 최신 항목(todoSeq가 큰 값)이 위로 오도록 내림차순 정렬합니다.
        todoSeq: 'DESC',
      },
    });
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
}
