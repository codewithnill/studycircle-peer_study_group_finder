// We import NestFactory to create the NestJS application.
import { NestFactory } from '@nestjs/core';
// We import our root AppModule.
import { AppModule } from './app.module';

async function bootstrap() {
  // We create the application using our root module.
  const app = await NestFactory.create(AppModule);

  // This tells NestJS to listen for shutdown signals (like Ctrl+C).
  // It allows our PrismaService to run onModuleDestroy and close the database connection safely.
  app.enableShutdownHooks();

  // We start the server. It will use the PORT from .env if it exists, otherwise it defaults to 3000.
  await app.listen(process.env.PORT ?? 3000);
}
// We call the function to start everything.
void bootstrap();