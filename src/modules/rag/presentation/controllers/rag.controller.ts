import { Controller } from '@nestjs/common';

import { RagService } from '@/modules/rag/application/services/rag.service';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}
}
