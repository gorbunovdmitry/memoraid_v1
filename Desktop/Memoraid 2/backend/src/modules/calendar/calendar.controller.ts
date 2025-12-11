import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CalendarService } from "./calendar.service";
import { ReqUserId } from "../../common/request-user.decorator";
import { CreateEventDto } from "./dto/create-event.dto";
import { ListEventsDto } from "./dto/list-events.dto";

@Controller("events")
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  create(
    @ReqUserId() userId: bigint,
    @Body() body: CreateEventDto
  ) {
    return this.calendarService.create({ ...body, userId });
  }

  @Get()
  list(@ReqUserId() userId: bigint, @Query() query: ListEventsDto) {
    return this.calendarService.list({ userId, ...query });
  }
}

