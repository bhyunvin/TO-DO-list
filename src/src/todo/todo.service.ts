import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TodoEntity } from './todo.entity';
import { CreateTodoDto, UpdateTodoDto } from './todo.dto';
import { setAuditColumn } from '../utils/auditColumns';

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
    user: any,
    ip: string,
    createTodoDto: CreateTodoDto,
  ): Promise<TodoEntity> {
    const newTodo = this.todoRepository.create({
      ...createTodoDto,
      userSeq: user.userSeq, // 사용자 번호를 설정합니다.
    });
    setAuditColumn({ entity: newTodo, id: user.userId, ip: ip });

    return this.todoRepository.save(newTodo);
  }

  // 특정 ToDo 항목을 수정합니다.
  async update(
    id: number,
    user: any,
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
    setAuditColumn({ entity: todo, id: user.userId, ip: ip, isUpdate: true });

    return this.todoRepository.save(todo);
  }

  // 여러 ToDo 항목을 삭제 (soft delete)합니다.
  async delete(user: any, ip: string, todoIds: number[]): Promise<void> {
    await this.todoRepository.update(
      {
        todoSeq: In(todoIds), // ID 배열에 포함된 모든 항목을 대상으로 합니다.
        userSeq: user.userSeq,
      },
      {
        delYn: 'Y', // 'Y'로 설정하여 soft delete 처리합니다.
        auditColumns: {
          updId: user.userId,
          updDtm: new Date(),
          updIp: ip,
        },
      },
    );
  }
}
