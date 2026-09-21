"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const express_1 = require("express");
const app_module_1 = require("../src/app.module");
const server = (0, express_1.default)();
let isReady = false;
let initPromise = null;
server.use(express_1.default.json({ limit: '25mb' }));
server.use(express_1.default.urlencoded({ limit: '25mb', extended: true }));
server.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'Booran Warranty API (Vercel Serverless)',
        isNestReady: isReady,
        hasMongoUri: !!process.env.MONGODB_URI,
        timestamp: new Date().toISOString(),
    });
});
async function bootstrap() {
    if (isReady)
        return;
    server.get('/', (req, res) => {
        res.status(200).json({
            status: 'online',
            service: 'Booran Warranty Evidence & Review API',
            version: '1.0.0',
            apiDocs: '/api/docs',
            apiPrefix: '/api/v1',
            timestamp: new Date().toISOString(),
        });
    });
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(server));
    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Booran Warranty Evidence Capture & Review API')
        .setDescription(`Workshop-First Multi-Brand Warranty Evidence & Review Portal API
Classification: Booran Motor Group · OmniSuiteAI Internal`)
        .setVersion('1.0.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        customSiteTitle: 'Booran Warranty API Docs · OmniSuiteAI',
        customCss: `
      .swagger-ui .topbar { background-color: #081225; border-bottom: 2px solid #1a56db; }
      .swagger-ui .info .title { color: #1a56db; }
    `,
    });
    await app.init();
    isReady = true;
}
async function handler(req, res) {
    if (req.path === '/health' || req.url === '/health') {
        return server(req, res);
    }
    try {
        if (!isReady) {
            if (!initPromise) {
                initPromise = bootstrap();
            }
            await initPromise;
        }
        server(req, res);
    }
    catch (err) {
        console.error('NestJS Vercel Serverless Bootstrap Error:', err);
        initPromise = null;
        res.status(500).json({
            statusCode: 500,
            error: 'Vercel Function Error',
            message: err?.message || 'Failed to initialize NestJS application on Vercel',
            hint: !process.env.MONGODB_URI
                ? 'MONGODB_URI is missing in Vercel Environment Variables.'
                : 'If this is a timeout, check MongoDB Atlas Network Access (0.0.0.0/0 must be whitelisted).',
        });
    }
}
module.exports = handler;
exports.default = handler;
//# sourceMappingURL=index.js.map