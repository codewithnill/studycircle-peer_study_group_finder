// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';

// the users module.
// later it will hold the user profile: name, department, year, bio, and subjects of interest
// (week 2 of the plan). safety: it must never send emails or password hashes to other users.
// it is empty for now. we create the folder and the boundary first.
// "@Module({})" tells nestjs that this class is a module.
// the empty braces mean it has no controllers or services yet.
@Module({})
export class UsersModule {}