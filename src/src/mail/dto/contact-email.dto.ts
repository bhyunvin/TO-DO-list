import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ContactEmailDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: '내용은 최소 10자 이상 입력해주세요.' })
  content: string;
}
