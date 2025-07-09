import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationException, BusinessException, SystemException } from '../exceptions';

@Catch(ValidationException, BusinessException, SystemException)
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as object;

    // 로그 레벨을 예외 타입에 따라 결정
    if (exception instanceof SystemException) {
      this.logger.error(`System error: ${JSON.stringify(exceptionResponse)}`);
    } else if (exception instanceof BusinessException) {
      this.logger.warn(`Business logic error: ${JSON.stringify(exceptionResponse)}`);
    } else if (exception instanceof ValidationException) {
      this.logger.warn(`Validation error: ${JSON.stringify(exceptionResponse)}`);
    } else {
      this.logger.error(`Unknown error: ${JSON.stringify(exceptionResponse)}`);
    }

    response.status(status).json({
      timestamp: new Date().toISOString(),
      ...exceptionResponse,
    });
  }
}
