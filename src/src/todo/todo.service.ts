import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TodoEntity } from './todo.entity';
import { CreateTodoDto, UpdateTodoDto } from './todo.dto';

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
  async create(userSeq: number, createTodoDto: CreateTodoDto): Promise<TodoEntity> {
    const newTodo = this.todoRepository.create({
      ...createTodoDto,
      userSeq, // 사용자 ID를 설정합니다.
      auditColumns: {
        // 생성 및 수정 정보를 설정합니다.
        creation_user_seq: userSeq,
        creation_dtm: new Date().toISOString(),
        latest_update_user_seq: userSeq,
        latest_update_dtm: new Date().toISOString(),
      },
    });
    return this.todoRepository.save(newTodo);
  }

  // 특정 ToDo 항목을 수정합니다.
  async update(
    id: number,
    userSeq: number,
    updateTodoDto: UpdateTodoDto,
  ): Promise<TodoEntity> {
    const todo = await this.todoRepository.findOne({ where: { todoSeq: id, userSeq } });
    if (!todo) {
      // ToDo 항목이 없으면 null을 반환합니다.
      return null;
    }

    // 수정된 내용을 적용합니다.
    Object.assign(todo, updateTodoDto);
    todo.auditColumns.latest_update_user_seq = userSeq;
    todo.auditColumns.latest_update_dtm = new Date().toISOString();

    return this.todoRepository.save(todo);
  }

  // 여러 ToDo 항목을 삭제 (soft delete)합니다.
  async delete(userSeq: number, todoIds: number[]): Promise<void> {
    await this.todoRepository.update(
      {
        todoSeq: In(todoIds), // ID 배열에 포함된 모든 항목을 대상으로 합니다.
        userSeq
      },
      {
        delYn: 'Y', // 'Y'로 설정하여 soft delete 처리합니다.
        auditColumns: {
            latest_update_user_seq: userSeq,
            latest_update_dtm: new Date().toISOString(),
        }
      },
    );
  }
}
