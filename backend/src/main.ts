import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  const apiPrefix = configService.get("API_PREFIX") || "api";
  app.setGlobalPrefix(apiPrefix);

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS — CORS_ORIGIN can be a comma-separated allowlist (e.g.
  // "http://localhost:8080,https://refunds.example.com") for production;
  // unset/"*" falls back to reflecting the request's own origin, which is
  // fine for local/dev use where the frontend's exact origin isn't fixed.
  const corsOrigin = configService.get<string>("CORS_ORIGIN");
  app.enableCors({
    origin: corsOrigin && corsOrigin !== "*" ? corsOrigin.split(",").map((o) => o.trim()) : true,
    credentials: true,
  });

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get("PORT") || 3000;
  await app.listen(port);

  console.log(
    ` Application is running on: http://localhost:${port}/${apiPrefix}`,
  );
}

bootstrap();
