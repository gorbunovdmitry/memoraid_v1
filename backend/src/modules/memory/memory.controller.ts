import { Body, Controller, Get, HttpException, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common";
import { MemoryService } from "./memory.service";
import { ReqUserId } from "../../common/request-user.decorator";
import { CreateMemoryDto } from "./dto/create-memory.dto";
import { SearchMemoryDto } from "./dto/search-memory.dto";
import { UpdateMemoryDto } from "./dto/update-memory.dto";

@Controller("memories")
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Post()
  create(
    @ReqUserId() userId: bigint,
    @Body() body: CreateMemoryDto
  ) {
    return this.memoryService.create({ ...body, userId });
  }

  @Get()
  list(@ReqUserId() userId: bigint, @Query() query: SearchMemoryDto) {
    return this.memoryService.search({ userId, ...query });
  }

  @Get(":id")
  async getOne(@ReqUserId() userId: bigint, @Param("id") id: string) {
    try {
      const memoryId = BigInt(id);
      return await this.memoryService.findOne(userId, memoryId);
    } catch (error) {
      if (error instanceof Error && error.message === "Memory not found") {
        throw new HttpException("Memory not found", HttpStatus.NOT_FOUND);
      }
      if (error instanceof Error && error.message.includes("Invalid")) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException("Failed to load memory", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(":id")
  update(
    @ReqUserId() userId: bigint,
    @Param("id") id: string,
    @Body() body: UpdateMemoryDto
  ) {
    return this.memoryService.update(userId, BigInt(id), body);
  }
}

