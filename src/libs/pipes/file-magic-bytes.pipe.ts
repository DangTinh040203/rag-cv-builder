import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { fromBuffer } from 'file-type';

/**
 * Validates uploaded files by checking the actual file content (magic bytes)
 * instead of relying on the user-provided Content-Type MIME header.
 *
 * This prevents attackers from uploading malicious files disguised as PDFs.
 */
@Injectable()
export class FileMagicBytesValidator implements PipeTransform {
  constructor(private readonly allowedMimes: string[]) {}

  async transform(file: Express.Multer.File): Promise<Express.Multer.File> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileType = await fromBuffer(file.buffer);

    if (!fileType || !this.allowedMimes.includes(fileType.mime)) {
      throw new BadRequestException(
        `Invalid file type. Expected: ${this.allowedMimes.join(', ')}. ` +
          `Detected: ${fileType?.mime ?? 'unknown'}`,
      );
    }

    return file;
  }
}
