import { Module } from "@nestjs/common";
import { IngestController } from "./ingest.controller";
import { IngestService } from "./ingest.service";
import { MemoryModule } from "../memory/memory.module";
import { CalendarModule } from "../calendar/calendar.module";
import { AdviceModule } from "../advice/advice.module";
import { AudioModule } from "../audio/audio.module";
import { ChatModule } from "../chat/chat.module";
import { LlmService } from "../../common/llm.service";

@Module({
  imports: [MemoryModule, CalendarModule, AdviceModule, AudioModule, ChatModule],
  controllers: [IngestController],
  providers: [IngestService, LlmService]
})
export class IngestModule {}

