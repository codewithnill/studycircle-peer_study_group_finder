// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';
// import: the users service. the module lists it as a provider so nestjs can create it and share it.
import { UsersService } from './users.service';

// the users module.
// later it will hold the user profile: name, department, year, bio, and subjects of interest
// (week 2 of the plan). safety: it must never send emails or password hashes to other users.

// "@Module()" tells nestjs that this class is a module.
// the profile routes (controller) are added later in week 2. for now the module only offers the service.
@Module({
  // providers are the classes that nestjs creates inside this module.
  providers: [UsersService],
  // exports let other modules use these providers. the auth module needs the users service to find and create people.
  // other modules must go through this service and never read the users table themselves.
  exports: [UsersService],
})
export class UsersModule {}