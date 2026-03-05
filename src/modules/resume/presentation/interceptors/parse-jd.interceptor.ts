import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { Observable } from 'rxjs';

@Injectable()
export class ParseJdInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (file) {
      const parser = new PDFParse({ data: file.buffer });
      const data = await parser.getText();
      request.body.jobDescription = data.text;
    }

    return next.handle();
  }
}
