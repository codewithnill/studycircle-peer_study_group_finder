// import: "Injectable" marks a class so nestjs can create it and hand it to other classes.
import { Injectable } from '@nestjs/common';
// import: prismaservice is the one shared database connection. nestjs hands it in, so this file never opens a connection.
import { PrismaService } from '../prisma/prisma.service';
// import: "Prisma" gives the type tools. "Role" holds the fixed words for roles (student, admin) from the schema.
// safety: the fixed words come from the generated client and are never typed by hand, so a typo cannot create a wrong role.
import { Prisma, Role } from '../generated/prisma/client';

// the fields that are safe to show to other people.
// safety: email and passwordHash are left out on purpose. a new field must be added here by hand, so nothing leaks by accident.
// "satisfies" asks typescript to check the object against the prisma type, without making the type wider.
export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  department: true,
  academicYear: true,
  bio: true,
  role: true,
} satisfies Prisma.UserSelect;

// the fields a person may see about their own account. same as the safe fields, plus the email.
// safety: use this only for the logged-in person's own data, never for another person.
export const OWN_USER_SELECT = {
  ...SAFE_USER_SELECT,
  email: true,
} satisfies Prisma.UserSelect;

// the fields that login needs to check the password and the account state.
// safety: this holds the password hash. it is for the auth service only and must never go into a reply.
export const LOGIN_USER_SELECT = {
  id: true,
  passwordHash: true,
  role: true,
  status: true,
} satisfies Prisma.UserSelect;

// the fields that the guard needs on every request to check who the person is and whether the account is still allowed.
export const AUTH_STATE_USER_SELECT = {
  id: true,
  role: true,
  status: true,
} satisfies Prisma.UserSelect;

// these types are built from the select objects above, so the types and the queries can never disagree.
export type SafeUser = Prisma.UserGetPayload<{ select: typeof SAFE_USER_SELECT }>;
export type OwnUser = Prisma.UserGetPayload<{ select: typeof OWN_USER_SELECT }>;
export type LoginUser = Prisma.UserGetPayload<{ select: typeof LOGIN_USER_SELECT }>;
export type AuthStateUser = Prisma.UserGetPayload<{ select: typeof AUTH_STATE_USER_SELECT }>;

// the data that is needed to create a student.
// there is no "role" field here on purpose, so nobody can ask for the admin role through this function.
export interface CreateStudentInput {
  name: string;
  email: string;
  // safety: this is the bcrypt hash made by the auth service. the real password never reaches this file.
  passwordHash: string;
  department?: string;
  academicYear?: number;
}

// @Injectable() tells nestjs that this class can be created by nestjs and given to other classes (dependency injection).
@Injectable()
// this service owns every database query on the users table.
// it keeps one job (single responsibility): read and create users. password checks and tokens belong to the auth service.
export class UsersService {
  // the constructor receives the database connection. "private" also saves it as this.prisma.
  constructor(private readonly prisma: PrismaService) {}

  // cleans an email before it is saved or searched: removes spaces at the ends and makes every letter lowercase.
  // this way "Ana@x.com" and "ana@x.com" are the same account.
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  // finds a live account by email for the login check. returns null when there is none.
  // safety: the result holds the password hash. use it only inside the auth service.
  async findForLogin(email: string): Promise<LoginUser | null> {
    // findfirst is used because the search has two conditions: the email and "not deleted".
    return this.prisma.user.findFirst({
      // deletedAt: null hides deleted accounts (soft delete keeps the row, so it must be filtered here).
      where: { email: this.normalizeEmail(email), deletedAt: null },
      // take only the fields that login needs.
      select: LOGIN_USER_SELECT,
    });
  }

  // finds the id, role, and status of a live account. the guard calls this on every request.
  // reading the status from the database means a suspension works at once, not when the token expires.
  async findAuthStateById(id: number): Promise<AuthStateUser | null> {
    return this.prisma.user.findFirst({
      // a deleted account gives null, so a deleted person is treated as not logged in.
      where: { id, deletedAt: null },
      select: AUTH_STATE_USER_SELECT,
    });
  }

  // finds a live account by id and returns only the safe fields. returns null when there is none.
  async findSafeById(id: number): Promise<SafeUser | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: SAFE_USER_SELECT,
    });
  }

  // finds the logged-in person's own account, with the email included. returns null when there is none.
  // safety: call this only with the id of the logged-in person, never with an id from the request address.
  async findOwnById(id: number): Promise<OwnUser | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: OWN_USER_SELECT,
    });
  }

  // creates a new student account and returns only the safe fields.
  // a duplicate email makes the database refuse with error P2002. the auth service catches it and gives an exact message.
  async createStudent(input: CreateStudentInput): Promise<SafeUser> {
    return this.prisma.user.create({
      data: {
        name: input.name,
        // the email is cleaned the same way as in the login search, so both always match.
        email: this.normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        // the role is always student here. safety: an admin account is made only by the seed script.
        role: Role.student,
        department: input.department,
        academicYear: input.academicYear,
      },
      // the reply never holds the email or the hash.
      select: SAFE_USER_SELECT,
    });
  }
}