// NestFactory is the tool that builds and starts a NestJS application.
import { NestFactory } from '@nestjs/core';
// AppModule is the root module. It is the starting point that connects every other module.
import { AppModule } from './app.module';

// This function starts the whole backend server.
// It is "async" because creating the app and opening the port take time, and we wait for them.
async function bootstrap() {
  // Build the app from the root module. "await" means: wait here until it is ready.
  const app = await NestFactory.create(AppModule);

  // Tell NestJS to listen for the "stop" signal (for example, when you press Ctrl+C).
  // Without this line, onModuleDestroy() in PrismaService never runs,
  // so the database connection is cut off instead of closed cleanly.
  app.enableShutdownHooks();

  // Start listening for requests. Use the PORT from the environment if it exists, otherwise 3000.
  await app.listen(process.env.PORT ?? 3000);
}

// Run the function. "void" means we do not wait for its result here.
void bootstrap();