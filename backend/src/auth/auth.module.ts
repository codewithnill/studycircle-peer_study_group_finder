// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';
// import: "APP_GUARD" is a special name. a guard registered under it runs on every route in the whole app.
import { APP_GUARD } from '@nestjs/core';
// import: the jwt module supplies the tool that signs and checks tokens. the secret is given at each call, so no options are set here.
import { JwtModule } from '@nestjs/jwt';
// import: the users module exports the users service, which the auth files need.
import { UsersModule } from '../users/users.module';
// import: the auth pieces made in the earlier steps.
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TokenService } from './token.service';

// the auth module.
// it holds everything about logging in: register, login, logout, refresh tokens (week 2 of the plan),
// and the two guards that decide who may enter a route.
// "@Module()" tells nestjs that this class is a module.
@Module({
  // imports are other modules whose providers this module needs.
  imports: [
    // supplies the jwt tool. no secret is set here, because the token service passes the secret at each call.
    JwtModule.register({}),
    // supplies the users service (it is exported by the users module).
    UsersModule,
  ],
  // controllers receive the http requests. this one has the five auth routes.
  controllers: [AuthController],
  // providers are the classes that nestjs creates inside this module.
  providers: [
    AuthService,
    TokenService,
    // safety: registering a guard under APP_GUARD runs it on every route in the app, so a new route is locked by default.
    // the order matters: the login guard comes first and puts the person on the request. the roles guard comes after it and reads that person.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}