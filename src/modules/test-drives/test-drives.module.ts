import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TestDrivesController } from './test-drives.controller';
import { TestDrivesService } from './test-drives.service';
import { TestDriveLog, TestDriveLogSchema } from '../../schemas/test-drive-log.schema';
import { Site, SiteSchema } from '../../schemas/site.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: TestDriveLog.name, schema: TestDriveLogSchema },
      { name: Site.name, schema: SiteSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [TestDrivesController],
  providers: [TestDrivesService],
  exports: [TestDrivesService],
})
export class TestDrivesModule {}
