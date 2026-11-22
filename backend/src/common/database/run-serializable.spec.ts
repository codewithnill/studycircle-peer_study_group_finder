// import: "Prisma" gives the transaction level words, so the test can check that "Serializable" was asked for.
import { Prisma } from '../../generated/prisma/client';
// import: the helper under test, its check function, its limit, and the type of the small fake connection.
import {
  isTransactionConflict,
  runSerializable,
  SERIALIZABLE_MAX_ATTEMPTS,
  TransactionRunner,
} from './run-serializable';

// builds a fake prisma error with a given code, like "P2034".
// the helper checks only the name and the code, so a plain error with those two values is enough.
function prismaError(code: string): Error {
  const error = new Error('fake prisma error');
  error.name = 'PrismaClientKnownRequestError';
  return Object.assign(error, { code });
}

// "describe" groups the tests for one thing. here: the retry helper.
describe('runSerializable', () => {
  // a fake "$transaction" function. jest.fn() records every call, so the tests can count the tries.
  // it is kept in its own variable, so the tests never read a method off an object (the lint rule "unbound-method").
  let transaction: jest.Mock;
  // the fake connection that is handed to the helper.
  let runner: TransactionRunner;
  // a fake piece of work. the fake transaction never runs it, so it only has to exist.
  const work = jest.fn();

  // "beforeEach" runs before every test, so each test starts with a clean fake.
  beforeEach(() => {
    transaction = jest.fn();
    runner = { $transaction: transaction } as unknown as TransactionRunner;
  });

  // the normal case: the work succeeds on the first try.
  it('gives back the result after one try at the serializable level', async () => {
    transaction.mockResolvedValueOnce('done');

    await expect(runSerializable(runner, work)).resolves.toBe('done');

    // exactly one try, with the work and the serializable level.
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledWith(work, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  // one collision, then success: the person never sees an error.
  it('tries again after a P2034 collision and gives back the result', async () => {
    transaction.mockRejectedValueOnce(prismaError('P2034')).mockResolvedValueOnce('done');

    await expect(runSerializable(runner, work)).resolves.toBe('done');
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  // a collision every time: after the last try the error reaches the caller, and the filter answers 409.
  it('gives up after the maximum number of tries and passes the P2034 error on', async () => {
    const conflict = prismaError('P2034');
    transaction.mockRejectedValue(conflict);

    await expect(runSerializable(runner, work)).rejects.toBe(conflict);
    expect(transaction).toHaveBeenCalledTimes(SERIALIZABLE_MAX_ATTEMPTS);
  });

  // a rule error from inside the work (like "this group is full") must not run again.
  it('does not try again after a normal error', async () => {
    const ruleError = new Error('This group is full');
    transaction.mockRejectedValueOnce(ruleError);

    await expect(runSerializable(runner, work)).rejects.toBe(ruleError);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  // another database error, like a broken unique rule (P2002), must not run again either.
  it('does not try again after a different prisma error', async () => {
    const duplicate = prismaError('P2002');
    transaction.mockRejectedValueOnce(duplicate);

    await expect(runSerializable(runner, work)).rejects.toBe(duplicate);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  // the caller may set a smaller number of tries.
  it('follows a custom maximum number of tries', async () => {
    transaction.mockRejectedValue(prismaError('P2034'));

    await expect(runSerializable(runner, work, 1)).rejects.toThrow('fake prisma error');
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});

// the tests for the check function on its own.
describe('isTransactionConflict', () => {
  it('is true for a prisma P2034 error', () => {
    expect(isTransactionConflict(prismaError('P2034'))).toBe(true);
  });

  it('is false for a prisma error with another code', () => {
    expect(isTransactionConflict(prismaError('P2002'))).toBe(false);
  });

  it('is false for a normal error and for a value that is not an error', () => {
    expect(isTransactionConflict(new Error('P2034'))).toBe(false);
    expect(isTransactionConflict({ name: 'PrismaClientKnownRequestError', code: 'P2034' })).toBe(false);
    expect(isTransactionConflict(null)).toBe(false);
  });
});