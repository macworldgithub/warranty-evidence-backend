import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StorageModule } from './common/storage/storage.module';
import { SitesModule } from './modules/sites/sites.module';
import { BrandsModule } from './modules/brands/brands.module';
import { BrandPacksModule } from './modules/brand-packs/brand-packs.module';
import { WarrantyCasesModule } from './modules/warranty-cases/warranty-cases.module';
import { AuthModule } from './modules/auth/auth.module';
import { VehicleModule } from './modules/vehicle/vehicle.module';
import { VoiceToTechModule } from './modules/voice-to-tech/voice-to-tech.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubmissionPackModule } from './modules/submission-pack/submission-pack.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        return {
          uri,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              console.log('🍃 MongoDB Atlas Connected Successfully');
            });
            connection.on('error', (err: any) => {
              console.error('🍃 MongoDB Connection Error:', err);
            });
            return connection;
          },
        };
      },
      inject: [ConfigService],
    }),
    SitesModule,
    BrandsModule,
    BrandPacksModule,
    WarrantyCasesModule,
    AuthModule,
    VehicleModule,
    VoiceToTechModule,
    NotificationsModule,
    SubmissionPackModule,
    DashboardModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
