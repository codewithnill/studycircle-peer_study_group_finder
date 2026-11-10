// imports from nestjs.
// "ArgumentMetadata" tells a pipe which part of the request it is looking at (body, query, ...).
// "Injectable" marks a class so nestjs can create and manage it.
// "PipeTransform" is the shape every pipe must follow.
import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
// our helper that turns every key into camelCase.
import { keysToCamelCase } from '../utils/case-converter';

// the snake_case to camelCase pipe.
// the client sends keys like max_size, but our code and our dtos use maxSize.
// this pipe changes the keys of incoming data before anything else sees them.
// it must be registered before the validation pipe, so the validation sees camelCase keys.
// a pipe returns a new object, so we never change request.query itself
// (in express 5 that property cannot be reassigned).
// rule for controllers: always take the whole body or query as one dto object,
// like @Body() dto and @Query() dto. do not pick out one key by name, like @Query('max_size').
// "@Injectable()" lets nestjs create this class and use it.
@Injectable()
export class SnakeToCamelPipe implements PipeTransform {
  // nestjs calls this once for every controller argument.
  // "value" is the data. "metadata.type" says where it came from.
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    // only the body and the query string carry keys written by the client.
    if (metadata.type === 'body' || metadata.type === 'query') {
      return keysToCamelCase(value);
    }

    // route parameters (like the 12 in /groups/12), custom values, and uploaded files stay as they are.
    return value;
  }
}