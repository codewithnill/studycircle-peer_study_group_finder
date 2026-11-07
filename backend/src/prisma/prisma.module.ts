import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() means we don't need to import this module in every other module. 
// NestJS will make it available everywhere automatically.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}