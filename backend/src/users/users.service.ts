// import: "Injectable" marks a class so nestjs can create it and hand it to other classes.
// "BadRequestException" (400), "ConflictException" (409), and "NotFoundException" (404) are the errors this service throws.
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
// import: prismaservice is the one shared database connection. nestjs hands it in, so this file never opens a connection.
import { PrismaService } from '../prisma/prisma.service';
// import: "Prisma" gives the type tools, the error class, and the transaction levels.
// "Role" and "UserStatus" hold the fixed words from the schema.
// safety: the fixed words come from the generated client and are never typed by hand, so a typo cannot create a wrong role or status.
import { Prisma, Role, UserStatus } from '../generated/prisma/client';
// import: the input shape of the profile edit. it is already checked by the validation pipe when it arrives here.
import { UpdateProfileDto } from './dto/update-profile.dto';
// import: the profile limit and the profile messages, so the text lives in one place.
import {
  MAX_SUBJECTS_PER_USER,
  NOTHING_TO_UPDATE_MESSAGE,
  PROFILE_NOT_FOUND_MESSAGE,
  SUBJECT_ALREADY_ADDED_MESSAGE,
  SUBJECT_LIMIT_MESSAGE,
  SUBJECT_NOT_FOUND_MESSAGE,
  SUBJECT_NOT_IN_LIST_MESSAGE,
} from './users.constants';

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

// the two fields of a subject that a profile shows. the category, the course code, and the dates are not needed there.
export const SUBJECT_SUMMARY_SELECT = {
  id: true,
  name: true,
} satisfies Prisma.SubjectSelect;

// the fields of a public profile, as one database query.
// safety: there is no email, role, status, or passwordHash here. role is left out so a stranger cannot find the admin account.
// the subjects come through the user_subjects link table. only active subjects are read, because a hidden subject must act as if it does not exist.
// they are sorted by name, so the list looks the same every time.
export const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  department: true,
  academicYear: true,
  bio: true,
  userSubjects: {
    where: { subject: { isActive: true } },
    orderBy: { subject: { name: 'asc' } },
    select: { subject: { select: SUBJECT_SUMMARY_SELECT } },
  },
} satisfies Prisma.UserSelect;

// the fields of a person's own profile: the public fields plus their own email and role.
// safety: use this only for the logged-in person's own data, never for another person.
export const OWN_PROFILE_SELECT = {
  ...PUBLIC_PROFILE_SELECT,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

// these types are built from the select objects above, so the types and the queries can never disagree.
export type SafeUser = Prisma.UserGetPayload<{ select: typeof SAFE_USER_SELECT }>;
export type OwnUser = Prisma.UserGetPayload<{ select: typeof OWN_USER_SELECT }>;
export type LoginUser = Prisma.UserGetPayload<{ select: typeof LOGIN_USER_SELECT }>;
export type AuthStateUser = Prisma.UserGetPayload<{ select: typeof AUTH_STATE_USER_SELECT }>;
type PublicProfileRow = Prisma.UserGetPayload<{ select: typeof PUBLIC_PROFILE_SELECT }>;
type OwnProfileRow = Prisma.UserGetPayload<{ select: typeof OWN_PROFILE_SELECT }>;

// one subject as a profile shows it.
export interface SubjectSummary {
  id: number;
  name: string;
}

// the reply shape of a public profile. the response interceptor changes the keys to snake_case (academicYear becomes academic_year).
// safety: these are the only fields another person can ever see.
export interface PublicProfile {
  id: number;
  name: string;
  department: string | null;
  academicYear: number | null;
  bio: string | null;
  subjects: SubjectSummary[];
}

// the reply shape of a person's own profile. it adds their own email and role.
export interface OwnProfile extends PublicProfile {
  email: string;
  role: Role;
}

// turns a database row into the public reply shape.
// the link rows ({ subject: { id, name } }) are flattened into a plain list ({ id, name }), so the reply has no database details.
// every field is written out by hand, so a field added to the query later never reaches the reply by accident.
function toPublicProfile(row: PublicProfileRow): PublicProfile {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    academicYear: row.academicYear,
    bio: row.bio,
    subjects: row.userSubjects.map((link) => link.subject),
  };
}

// turns a database row into the own reply shape: the public shape plus the email and the role.
function toOwnProfile(row: OwnProfileRow): OwnProfile {
  return { ...toPublicProfile(row), email: row.email, role: row.role };
}

// checks whether an error is the database error "a unique rule was broken" (prisma code P2002).
// here it means the same subject was added twice at the same moment.
function isUniqueRuleError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

// the data that is needed to create a student.
// there is no "role" field here on purpose, so nobody can ask for the admin role through this function.
export interface CreateStudentInput {
  name: string;
  email: string;
  // safety: this is the bcrypt hash made by the auth service. the real password never reaches this file.
  passwordHash: string;
  department?: string | null;
  academicYear?: number | null;
}

// @Injectable() tells nestjs that this class can be created by nestjs and given to other classes (dependency injection).
@Injectable()
// this service owns every database query on the users table and on the user_subjects link table.
// it keeps one job (single responsibility): read, create, and change user profiles. password checks and tokens belong to the auth service.
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

  // gives the logged-in person's own profile, with their subjects. returns null when the account is gone.
  // the controller turns null into the same 401 reply as the login guard.
  // safety: call this only with the id from the login cookie, never with an id from the request address.
  async getOwnProfile(userId: number): Promise<OwnProfile | null> {
    const row = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: OWN_PROFILE_SELECT,
    });

    // no row means the account was deleted after the guard checked it.
    return row ? toOwnProfile(row) : null;
  }

  // gives another person's public profile.
  // safety: only live, active accounts are shown. a suspended account, a deleted account,
  // and an unknown id all give the same 404 reply, so nobody can tell the three cases apart.
  async getPublicProfile(id: number): Promise<PublicProfile> {
    const row = await this.prisma.user.findFirst({
      where: { id, deletedAt: null, status: UserStatus.active },
      select: PUBLIC_PROFILE_SELECT,
    });

    if (!row) {
      throw new NotFoundException(PROFILE_NOT_FOUND_MESSAGE);
    }

    return toPublicProfile(row);
  }

  // changes the logged-in person's own name, department, year, or bio, and gives back the new own profile.
  // a missing field is not changed. null clears a field that may be empty.
  // safety: the user id comes from the login cookie, so a person can only ever change their own row.
  async updateOwnProfile(userId: number, dto: UpdateProfileDto): Promise<OwnProfile> {
    // the four allowed fields are copied one by one. the dto is never spread into the query,
    // so even a field that somehow got past the validation pipe can never reach the database.
    // prisma skips a field whose value is undefined, so "missing" means "do not change".
    const data: Prisma.UserUpdateInput = {
      name: dto.name,
      department: dto.department,
      academicYear: dto.academicYear,
      bio: dto.bio,
    };

    // an empty body changes nothing. it is most likely a mistake in the form, so it gives a clear 400 error.
    if (Object.values(data).every((value) => value === undefined)) {
      throw new BadRequestException(NOTHING_TO_UPDATE_MESSAGE);
    }

    // the update finds the row by id and "not deleted". a row deleted a moment ago gives prisma error P2025,
    // which the shared error filter turns into a 404 reply.
    const row = await this.prisma.user.update({
      where: { id: userId, deletedAt: null },
      data,
      select: OWN_PROFILE_SELECT,
    });

    return toOwnProfile(row);
  }

  // adds one subject to the logged-in person's list of interests, and gives back that subject.
  // the checks and the insert run in one transaction (all steps succeed together, or none of them do).
  // the serializable level makes postgres act as if two transactions ran one after the other,
  // so two quick clicks cannot push the list past the limit.
  async addSubject(userId: number, subjectId: number): Promise<SubjectSummary> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // 1. the subject must exist and be active. a hidden subject gets the same reply as an unknown one.
          const subject = await tx.subject.findFirst({
            where: { id: subjectId, isActive: true },
            select: SUBJECT_SUMMARY_SELECT,
          });
          if (!subject) {
            throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
          }

          // 2. the same subject must not be in the list already. the pair (user id, subject id) is the primary key.
          const existing = await tx.userSubject.findUnique({
            where: { userId_subjectId: { userId, subjectId } },
            select: { userId: true },
          });
          if (existing) {
            throw new ConflictException(SUBJECT_ALREADY_ADDED_MESSAGE);
          }

          // 3. the list must not be full. only active subjects count, because hidden ones are not shown to the person.
          const count = await tx.userSubject.count({
            where: { userId, subject: { isActive: true } },
          });
          if (count >= MAX_SUBJECTS_PER_USER) {
            throw new ConflictException(SUBJECT_LIMIT_MESSAGE);
          }

          // 4. every check passed, so the link row is saved.
          await tx.userSubject.create({ data: { userId, subjectId } });

          return subject;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      // the same subject added twice at the very same moment can still pass check 2 in both requests.
      // the primary key then refuses the second insert with P2002. it gets the same exact message as check 2.
      if (isUniqueRuleError(error)) {
        throw new ConflictException(SUBJECT_ALREADY_ADDED_MESSAGE);
      }
      // every other error (including the 404 and 409 above) is passed on to the shared error filter.
      throw error;
    }
  }

  // removes one subject from the logged-in person's list of interests.
  // deleteMany is used because it never throws when no row matches. it gives the number of deleted rows instead.
  // safety: the user id is part of the condition, so a person can only ever remove their own link row.
  async removeSubject(userId: number, subjectId: number): Promise<void> {
    const result = await this.prisma.userSubject.deleteMany({
      where: { userId, subjectId },
    });

    // nothing deleted means the subject was not in this person's list.
    if (result.count === 0) {
      throw new NotFoundException(SUBJECT_NOT_IN_LIST_MESSAGE);
    }
  }
}