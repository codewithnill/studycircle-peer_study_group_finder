// import: "SetMetadata" attaches a small mark to a route. a guard can read that mark later.
import { SetMetadata } from '@nestjs/common';

// the name of the mark. the guard reads the same name, so it is kept in one place.
export const IS_PUBLIC_KEY = 'isPublic';

// @Public() marks a route that needs no login, for example register and login.
// safety: every route is locked by default. only add this mark when a stranger really may call the route.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);