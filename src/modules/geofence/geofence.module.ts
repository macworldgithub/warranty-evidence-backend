import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GeofenceController } from './geofence.controller';
import { GeofenceService } from './geofence.service';
import { Site, SiteSchema } from '../../schemas/site.schema';
import { User, UserSchema } from '../../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Site.name, schema: SiteSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [GeofenceController],
  providers: [GeofenceService],
  exports: [GeofenceService],
})
export class GeofenceModule {}
