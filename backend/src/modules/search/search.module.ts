import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { MemoryModule } from "../memory/memory.module";
import { CalendarModule } from "../calendar/calendar.module";

@Module({
  imports: [MemoryModule, CalendarModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService]
})
export class SearchModule {}

