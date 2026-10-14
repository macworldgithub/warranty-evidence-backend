import { Body, Controller, Get, Headers, Module, Param, Post, Header } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { Invitation, InvitationSchema } from './invitation.schema';
import { InvitationMailService } from './invitation-mail.service';
import { InvitationsService } from './invitations.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { Site, SiteSchema } from '../../schemas/site.schema';

export class CreateInvitationDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 150) name: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @Length(1, 100) siteId: string;
}
export class InvitationTokenDto {
  @IsString() @Matches(/^[a-f\d]{64}$/) token: string;
}
export class AcceptInvitationDto extends InvitationTokenDto {
  @IsString() @Length(8, 128) password: string;
}
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly auth: AuthService, private readonly invitations: InvitationsService) {}
  @Get() @Header('Cache-Control', 'private, no-store')
  async list(@Headers('authorization') authorization?: string) {
    await this.auth.assertAdmin(authorization);
    return this.invitations.list();
  }
  @Post() @Header('Cache-Control', 'private, no-store')
  async create(@Body() input: CreateInvitationDto, @Headers('authorization') authorization?: string) {
    const admin = await this.auth.assertAdmin(authorization);
    return this.invitations.create(input, admin.id);
  }
  @Post(':id/resend')
  async resend(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const admin = await this.auth.assertAdmin(authorization);
    return this.invitations.resend(id, admin.id);
  }
  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    await this.auth.assertAdmin(authorization);
    return this.invitations.cancel(id);
  }
  @Post('inspect') @Header('Cache-Control', 'private, no-store')
  inspect(@Body() input: InvitationTokenDto) { return this.invitations.inspect(input.token); }
  @Post('accept') @Header('Cache-Control', 'private, no-store')
  accept(@Body() input: AcceptInvitationDto) { return this.invitations.accept(input.token, input.password); }
}
@Module({
  imports: [AuthModule, MongooseModule.forFeature([
    { name: Invitation.name, schema: InvitationSchema }, { name: User.name, schema: UserSchema }, { name: Site.name, schema: SiteSchema },
  ])],
  controllers: [InvitationsController], providers: [InvitationsService, InvitationMailService],
})
export class InvitationsModule {}
