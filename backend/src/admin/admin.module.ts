// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';

// the admin module.
// later it will hold the admin dashboard, the users and groups tables, suspensions,
// subjects and levels, and the activity log (weeks 9 and 10 of the plan).
// safety: every route here needs a valid login and the admin role, checked on the server.
// it is empty for now. we create the folder and the boundary first.
// "@Module({})" tells nestjs that this class is a module.
// the empty braces mean it has no controllers or services yet.
@Module({})
export class AdminModule {}