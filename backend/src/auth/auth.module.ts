// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';

// the auth module.
// later it will hold everything about logging in: register, login, logout,
// refresh tokens, and the guards that check who is calling (week 2 of the plan).
// it is empty for now. we create the folder and the boundary first.
// "@Module({})" tells nestjs that this class is a module.
// the empty braces mean it has no controllers or services yet.
// later we fill the braces with "controllers", "providers" (services), "imports", and "exports".
@Module({})
export class AuthModule {}