import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const ReqUserId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.userId as bigint | undefined;
});

export const ReqTgId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.tgId as bigint | undefined;
});

