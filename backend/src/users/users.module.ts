// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';
// import: the users controller. the module lists it so nestjs creates its routes.
import { UsersController } from './users.controller';
// import: the users service. the module lists it as a provider so nestjs can create it and share it.
import { UsersService } from './users.service';

// the users module. it holds the user profile: name, department, year, bio, and subjects of interest.
// safety: it must never send emails or password hashes to other users.

// "@Module()" tells nestjs that this class is a module.
@Module({
  // controllers are the classes that hold routes. nestjs reads their decorators and connects the addresses.
  controllers: [UsersController],
  // providers are the classes that nestjs creates inside this module.
  providers: [UsersService],
  // exports let other modules use these providers. the auth module needs the users service to find and create people.
  // other modules must go through this service and never read the users table themselves.
  exports: [UsersService],
})
export class UsersModule {}