// import: "Module" is the decorator that turns a class into a nestjs module.
import { Module } from '@nestjs/common';

// the chat module.
// later it will hold the websocket gateway (the live connection) and the saved messages
// (weeks 6 and 7 of the plan).
// safety: every connection and every message must check that the person is an active member of the group.
// it is empty for now. we create the folder and the boundary first.
// "@Module({})" tells nestjs that this class is a module.
// the empty braces mean it has no controllers or services yet.
@Module({})
export class ChatModule {}