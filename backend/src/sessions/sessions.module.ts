// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';

// the sessions module.
// later it will hold planned study meetings, the "i will attend" button,
// attendance, and the leader's "mark as completed" button (week 6 of the plan).
// reviews come after that, in week 10.
// it is empty for now. we create the folder and the boundary first.
// "@Module({})" tells nestjs that this class is a module.
// the empty braces mean it has no controllers or services yet.
@Module({})
export class SessionsModule {}