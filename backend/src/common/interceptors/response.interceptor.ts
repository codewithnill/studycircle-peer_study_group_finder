// imports from nestjs.

// "CallHandler" lets us run the controller and catch its reply.

// "ExecutionContext" describes the current request. we do not use it, but nestjs requires it.

// "Injectable" marks a class so nestjs can create and manage it.

// "NestInterceptor" is the shape every interceptor must follow.

// "StreamableFile" is how nestjs sends a file download. we must not wrap those.

import {

  CallHandler,

  ExecutionContext,

  Injectable,

  NestInterceptor,

  StreamableFile,

} from '@nestjs/common';

// "Observable" is the type of a stream of values over time. nestjs hands the reply to us inside one.

import { Observable } from 'rxjs';

// "map" lets us change the value inside that stream, like a list's map function.

import { map } from 'rxjs/operators';

// our box for list replies. we check for it to know when to add "meta".

import { PaginatedResult } from '../pagination/pagination';

// our helper that turns every key into snake_case.

import { keysToSnakeCase } from '../utils/case-converter';
 
// a small function used while turning data into json text.

// json cannot carry a bigint (a very big whole number), so we turn it into text.

// this is why ids like messages.id are sent as strings, like "9007".

function bigIntToString(_key: string, value: unknown): unknown {

  return typeof value === 'bigint' ? value.toString() : value;

}
 
// the response interceptor.

// it runs after a controller finishes and before the reply is sent.

// it wraps every success reply in "data" (and adds "meta" for lists),

// as the api shape rules say in section 2.

// errors are not handled here. the exception filter does that.

// "@Injectable()" lets nestjs create this class and use it.

@Injectable()

export class ResponseInterceptor implements NestInterceptor {

  // nestjs calls this method for every request.

  // "next.handle()" runs the controller. "pipe(map(...))" lets us change its reply.

  intercept(

    _context: ExecutionContext,

    next: CallHandler,

  ): Observable<unknown> {

    return next.handle().pipe(map((result: unknown) => this.wrap(result)));

  }
 
  // decides the final shape of one success reply.

  private wrap(result: unknown): unknown {

    // a file download is not json. it must be sent as it is.

    if (result instanceof StreamableFile) {

      return result;

    }
 
    // a list reply: send the items in "data" and the paging numbers in "meta".

    if (result instanceof PaginatedResult) {

      return {

        data: this.prepare(result.items),

        meta: this.prepare(result.meta),

      };

    }
 
    // any other reply goes in "data".

    // "?? null" turns "nothing" (undefined) into null, so actions like logout send { "data": null }.

    return { data: this.prepare(result ?? null) };

  }
 
  // cleans a value so it is ready to send as json with snake_case keys.

  private prepare(value: unknown): unknown {

    // step 1: turn the value into json text and back into plain data.

    // this changes dates into utc text, bigints into strings, and class objects into plain objects.

    // it also drops anything json cannot carry.

    const plain: unknown = JSON.parse(JSON.stringify(value, bigIntToString));
 
    // step 2: change every key from camelCase to snake_case.

    return keysToSnakeCase(plain);

  }

}
 