import { type INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';

import { AppModule } from '@/app/app.module';
import { Env } from '@/libs/configs';
import { GlobalExceptionFilter } from '@/libs/filters';

class BootstrapApplication {
  app: INestApplication;
  private configService: ConfigService;

  async run() {
    this.app = await NestFactory.create(AppModule);

    this.configService = this.app.get(ConfigService);
    const port = this.configService.getOrThrow<number>(Env.PORT);
    const apiPrefix = this.configService.get<string>(Env.API_PREFIX, 'api');
    const apiVersion = this.configService.get<string>(Env.API_VERSION, '1');

    this.app.setGlobalPrefix(`${apiPrefix}/v${apiVersion}`);

    this.setupMiddleware();
    this.setupSwagger(this.app);

    await this.app.listen(port);
    Logger.log(
      `Server running on http://localhost:${port}/${apiPrefix}/v${apiVersion}`,
      BootstrapApplication.name,
    );
  }

  private setupMiddleware() {
    this.app.use(cookieParser());
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
    this.app.useGlobalFilters(new GlobalExceptionFilter());

    this.app.enableCors({
      origin: this.configService.getOrThrow<string>(Env.FRONTEND_ORIGIN),
      credentials: true,
    });

    this.app.use(helmet());
    this.app.use(morgan('dev'));
  }

  private setupSwagger(app: INestApplication) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('CV Builder API')
        .setDescription('The API details of the CV Builder application')
        .setVersion('1.0')
        .addTag('CV Builder')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('api', app, document);
  }
}

void new BootstrapApplication().run();
