import { type INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppModule } from '@/app/app.module';
import { Env } from '@/libs/configs';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

class BootstrapApplication {
  app: INestApplication;
  private configService: ConfigService;

  async run() {
    this.app = await NestFactory.create(AppModule);

    this.configService = this.app.get(ConfigService);
    const port = this.configService.getOrThrow<number>(Env.PORT);

    this.setupMiddleware();
    this.setupSwagger(this.app);

    await this.app.listen(port);
    Logger.log(
      `Server running on http://localhost:${port}`,
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
