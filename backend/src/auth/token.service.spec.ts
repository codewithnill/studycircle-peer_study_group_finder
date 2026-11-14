// imports: the config reader type and the jwt tool. the real jwt tool is used, so the tests prove real tokens work.
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
// import: the fixed role words from the generated client.
import { Role } from '../generated/prisma/client';
// import: the token numbers, so the tests follow the real rules.
import { REFRESH_TOKEN_TTL_MS } from './auth.constants';
// import: the service under test.
import { TokenService } from './token.service';

// a fake secret for the tests only. it is long enough to pass the length rule.
const SECRET = 'fake_test_secret_that_is_long_enough_for_the_rule';
// a different fake secret, used to make tokens that must be refused.
const OTHER_SECRET = 'another_fake_secret_that_is_also_long_enough_ok';

// a group of tests for the token service.
describe('TokenService', () => {
  // the real jwt tool, used to build special tokens that the service must refuse.
  const jwt = new JwtService();

  // builds a token service with a fake config reader that returns the given secret.
  const makeService = (secret: string | undefined) => {
    const config = { get: jest.fn().mockReturnValue(secret) } as unknown as ConfigService;
    return new TokenService(jwt, config);
  };

  // tests for the access token.
  describe('access token', () => {
    // the token must carry only the user id, the role, and the two time fields.
    it('holds only sub, role, and the time fields', async () => {
      const token = await makeService(SECRET).signAccessToken(7, Role.student);

      // decode reads the content without checking it. it is enough to look at the keys.
      const decoded = jwt.decode(token) as Record<string, unknown>;

      // safety: no email and no name may be inside a token, because anyone can read it.
      expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'role', 'sub']);
      expect(decoded.sub).toBe('7');
      expect(decoded.role).toBe(Role.student);
    });

    // a token made by the service must pass the check and give back the same data.
    it('accepts its own token and returns the user id and role', async () => {
      const service = makeService(SECRET);
      const token = await service.signAccessToken(7, Role.admin);

      await expect(service.verifyAccessToken(token)).resolves.toEqual({
        userId: 7,
        role: Role.admin,
      });
    });

    // a token that was signed with another secret must be refused.
    it('refuses a token signed with a different secret', async () => {
      const forged = await jwt.signAsync(
        { sub: '1', role: Role.admin },
        { secret: OTHER_SECRET, expiresIn: 60 },
      );

      await expect(makeService(SECRET).verifyAccessToken(forged)).resolves.toBeNull();
    });

    // a token whose expiry time is in the past must be refused.
    it('refuses an expired token', async () => {
      // exp is the expiry time in seconds. here it is set to one minute ago.
      const expired = await jwt.signAsync(
        { sub: '1', role: Role.student, exp: Math.floor(Date.now() / 1000) - 60 },
        { secret: SECRET },
      );

      await expect(makeService(SECRET).verifyAccessToken(expired)).resolves.toBeNull();
    });

    // safety: a token that claims "no signature" (alg: none) must be refused.
    it('refuses a token that uses the none algorithm', async () => {
      // build the three parts by hand: header, payload, and an empty signature.
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(
        JSON.stringify({ sub: '1', role: Role.admin, exp: Math.floor(Date.now() / 1000) + 600 }),
      ).toString('base64url');
      const unsigned = `${header}.${body}.`;

      await expect(makeService(SECRET).verifyAccessToken(unsigned)).resolves.toBeNull();
    });

    // text that is not a token at all must give null, not an error.
    it('refuses text that is not a token', async () => {
      await expect(makeService(SECRET).verifyAccessToken('not-a-token')).resolves.toBeNull();
    });

    // a correctly signed token with an unknown role must be refused.
    it('refuses a token with an unknown role', async () => {
      const token = await jwt.signAsync({ sub: '1', role: 'superuser' }, { secret: SECRET, expiresIn: 60 });

      await expect(makeService(SECRET).verifyAccessToken(token)).resolves.toBeNull();
    });

    // a correctly signed token whose subject is not a number must be refused.
    it('refuses a token whose subject is not a user id', async () => {
      const token = await jwt.signAsync({ sub: 'abc', role: Role.student }, { secret: SECRET, expiresIn: 60 });

      await expect(makeService(SECRET).verifyAccessToken(token)).resolves.toBeNull();
    });
  });

  // tests for the refresh token.
  describe('refresh token', () => {
    // two tokens must never be equal, and each must be long enough to be unguessable.
    it('makes a different long random token every time', () => {
      const service = makeService(SECRET);
      const first = service.generateRefreshToken();
      const second = service.generateRefreshToken();

      expect(first).not.toEqual(second);
      // 48 bytes written as base64url are 64 characters.
      expect(first).toHaveLength(64);
    });

    // the stored value must not be the raw token, and it must be stable.
    it('hashes a token to a different but repeatable value', () => {
      const service = makeService(SECRET);
      const token = service.generateRefreshToken();
      const hash = service.hashRefreshToken(token);

      // safety: the raw token must never equal what is stored.
      expect(hash).not.toEqual(token);
      // sha-256 written as hex is 64 characters, which fits the varchar(255) column.
      expect(hash).toHaveLength(64);
      // the same token must always give the same hash, so a lookup by hash works.
      expect(service.hashRefreshToken(token)).toEqual(hash);
      // a different token must give a different hash.
      expect(service.hashRefreshToken(service.generateRefreshToken())).not.toEqual(hash);
    });

    // the expiry date must be about seven days from now.
    it('gives an expiry date seven days ahead', () => {
      const service = makeService(SECRET);
      const before = Date.now();

      const difference = service.refreshTokenExpiresAt().getTime() - before;

      // never shorter than seven days, and no more than five seconds longer (the time the test itself takes).
      expect(difference).toBeGreaterThanOrEqual(REFRESH_TOKEN_TTL_MS);
      expect(difference).toBeLessThan(REFRESH_TOKEN_TTL_MS + 5000);
    });
  });

  // tests for the startup check on the secret.
  describe('startup check', () => {
    // safety: the app must not start without a secret.
    it('refuses to start when the secret is missing', () => {
      expect(() => makeService(undefined)).toThrow('JWT_ACCESS_SECRET');
    });

    // safety: the app must not start with a weak secret.
    it('refuses to start when the secret is too short', () => {
      expect(() => makeService('too_short')).toThrow('JWT_ACCESS_SECRET');
    });
  });
});