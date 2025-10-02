import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
      where: {
        userSeq,
        todoDate,
        delYn: 'N', // 삭제되지 않은 항목만 조회합니다.
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
      entity: newTodo,
      id: user.userId,
      ip: ip,
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
      entity: todo,
      id: user.userId,
      ip: ip,
      isUpdate: true,
    };
    setAuditColumn(auditSettings);

    return this.todoRepository.save(todo);
  }

  // 여러 ToDo 항목을 삭제 (soft delete)합니다.
  async delete(
    user: Omit<UserEntity, 'userPassword'>,
    ip: string,
    todoIds: number[],
  ): Promise<void> {
    const todosToDelete = await this.todoRepository.find({
      where: {
        todoSeq: In(todoIds),
        userSeq: user.userSeq,
      },
    });

    for (const todo of todosToDelete) {
      todo.delYn = 'Y';
      setAuditColumn({ entity: todo, id: user.userId, ip, isUpdate: true });
    }

    await this.todoRepository.save(todosToDelete);
  }
}
