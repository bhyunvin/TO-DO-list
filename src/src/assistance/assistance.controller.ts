import {
  Controller,
  Post,
  Body,
} from '@nestjs/common';
import { RequestAssistanceDto } from './assistance.dto';
import { AssistanceService } from './assistance.service';

@Controller('assistance')
export class AssistanceController {
  constructor(private readonly assistanceService: AssistanceService) {}

  //로그인
  @Post('assist')
  async requestAssist(
    @Body() requestAssistanceDto: RequestAssistanceDto,
  ): Promise<RequestAssistanceDto> {
    return this.assistanceService.getGeminiResponse(requestAssistanceDto);
  }
}
