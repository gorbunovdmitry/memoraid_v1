import { Body, Controller, Post, Logger } from "@nestjs/common";
import { IngestService } from "./ingest.service";
import { ReqUserId } from "../../common/request-user.decorator";
import { IngestDto } from "./dto/ingest.dto";

@Controller("ingest")
export class IngestController {
  private readonly logger = new Logger(IngestController.name);

  constructor(private readonly ingestService: IngestService) {}

  @Post()
  async ingest(
    @ReqUserId() userId: bigint,
    @Body() body: IngestDto
  ) {
    try {
      // Проверка авторизации выполняется в UserContextMiddleware
      // В dev режиме middleware создает тестового пользователя без проверки initData
      this.logger.log(`[ingest] Received request: userId=${userId}, text="${body.text?.substring(0, 50)}..."`);
      return await this.ingestService.route({ ...body, userId });
    } catch (error) {
      this.logger.error(`[ingest] Error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}

