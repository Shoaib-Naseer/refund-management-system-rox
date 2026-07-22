"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const apiPrefix = configService.get("API_PREFIX") || "api";
    app.setGlobalPrefix(apiPrefix);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    const corsOrigin = configService.get("CORS_ORIGIN");
    app.enableCors({
        origin: corsOrigin && corsOrigin !== "*" ? corsOrigin.split(",").map((o) => o.trim()) : true,
        credentials: true,
    });
    app.enableShutdownHooks();
    const port = configService.get("PORT") || 3000;
    await app.listen(port);
    console.log(` Application is running on: http://localhost:${port}/${apiPrefix}`);
}
bootstrap();
//# sourceMappingURL=main.js.map