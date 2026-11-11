// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';

// the groups module.
// later it will hold creating and editing groups, search, join requests, members,
// and the leadership rules (weeks 3 to 5 of the plan).
// this is the heart of the project: finding and managing study groups.
// it is empty for now. we create the folder and the boundary first.
// "@Module({})" tells nestjs that this class is a module.
// the empty braces mean it has no controllers or services yet.
@Module({})
export class GroupsModule {}