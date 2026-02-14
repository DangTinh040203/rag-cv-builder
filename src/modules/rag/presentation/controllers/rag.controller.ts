import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RagService } from '@/modules/rag/application/services/rag.service';
import { GenerateTextDto } from '@/modules/rag/presentation/dtos/generate-text.dto';

@ApiTags('RAG')
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate text using LLM' })
  @ApiResponse({ status: 200, description: 'Text generated successfully' })
  async generateText(@Body() dto: GenerateTextDto) {
    return this.ragService.generateText(dto);
  }
}
