import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    const errorDetails =
      exception instanceof Error && process.env.NODE_ENV === 'development'
        ? exception.stack
        : undefined;

    this.logger.error(
      `HTTP ${status} Error: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined,
      `${request.method} ${request.url}`
    );

    // Извлекаем сообщение об ошибке
    let errorMessage: string;
    if (typeof message === 'string') {
      errorMessage = message;
    } else if (typeof message === 'object' && message !== null) {
      // Если message - объект (например, из HttpException.getResponse())
      errorMessage = (message as any).message || JSON.stringify(message);
    } else {
      errorMessage = 'Internal server error';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorMessage,
      ...(errorDetails && { error: errorDetails }),
    });
  }
}

