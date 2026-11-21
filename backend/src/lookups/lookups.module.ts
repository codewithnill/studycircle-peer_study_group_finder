// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';
// import: the controller with the two routes.
import { LookupsController } from './lookups.controller';
// import: the service that reads the two lists.
import { LookupsService } from './lookups.service';

// the lookups module. it owns the two small fixed lists of choices: subjects and levels.
// the prisma module is global, so it does not need to be imported here.

// "@Module()" tells nestjs that this class is a module.
@Module({
  // controllers hold routes. nestjs reads their decorators and connects the addresses.
  controllers: [LookupsController],
  // providers are the classes that nestjs creates inside this module.
  providers: [LookupsService],
})
export class LookupsModule {}