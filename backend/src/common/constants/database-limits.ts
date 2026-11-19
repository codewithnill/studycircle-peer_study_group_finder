// the largest number that a postgres "integer" column can hold (2 to the power of 31, minus 1).
// every normal id in this project (users, groups, subjects, sessions) is stored in an integer column.
// an id in the address that is bigger than this can never match a row.
// prisma would throw an error for such a number, and the reply would be a 500 error.
// so the code checks the id against this limit first and answers "not found" without asking the database.
export const MAX_INT_ID = 2_147_483_647;