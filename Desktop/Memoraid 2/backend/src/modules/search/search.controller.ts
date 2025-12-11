import { Controller, Get, Query } from "@nestjs/common";
import { SearchService } from "./search.service";
import { ReqUserId } from "../../common/request-user.decorator";
import { IsOptional, IsString } from "class-validator";

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@ReqUserId() userId: bigint, @Query() query: SearchQueryDto) {
    try {
      if (!query.q || query.q.trim().length === 0) {
        return { memories: [], events: [], total: 0 };
      }
      return await this.searchService.search({ userId, q: query.q.trim() });
    } catch (error: any) {
      console.error("[SearchController] Error:", error);
      return { memories: [], events: [], total: 0 };
    }
  }
}

