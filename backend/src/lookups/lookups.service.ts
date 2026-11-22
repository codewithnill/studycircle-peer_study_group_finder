// import: "Injectable" marks a class so nestjs can create it and hand it to other classes.
import { Injectable } from '@nestjs/common';
// import: prismaservice is the one shared database connection. nestjs hands it in, so this file never opens a connection.
import { PrismaService } from '../prisma/prisma.service';
// import: "Prisma" gives the type tools that check the select lists below against the real tables.
import { Prisma } from '../generated/prisma/client';

// the fields of one subject that a dropdown needs.
// safety: the dates and is_active are left out. a new field must be added here by hand, so nothing leaks by accident.
// "satisfies" asks typescript to check the object against the prisma type, without making the type wider.
export const SUBJECT_OPTION_SELECT = {
  id: true,
  name: true,
  category: true,
  courseCode: true,
} satisfies Prisma.SubjectSelect;

// the fields of one level that a dropdown needs. sort_order is used only for sorting, so it is not sent.
export const LEVEL_OPTION_SELECT = {
  id: true,
  name: true,
  description: true,
} satisfies Prisma.LevelSelect;

// these types are built from the select lists above, so the types and the queries can never disagree.
// the response interceptor later changes the keys to snake_case (courseCode becomes course_code).
export type SubjectOption = Prisma.SubjectGetPayload<{ select: typeof SUBJECT_OPTION_SELECT }>;
export type LevelOption = Prisma.LevelGetPayload<{ select: typeof LEVEL_OPTION_SELECT }>;

// @Injectable() tells nestjs that this class can be created by nestjs and given to other classes (dependency injection).
@Injectable()
// this service reads the two small fixed lists of choices: subjects and levels.
// it only reads. adding, editing, and hiding items is an admin job for week 9.
export class LookupsService {
  // the constructor receives the database connection. "private" also saves it as this.prisma.
  constructor(private readonly prisma: PrismaService) {}

  // gives every active subject, sorted by name, so the dropdown looks the same every time.
  // safety: a hidden subject (is_active = false) is left out, so nobody can pick it for a new group or a profile.
  async listActiveSubjects(): Promise<SubjectOption[]> {
    return this.prisma.subject.findMany({
      // only rows the admin has not hidden.
      where: { isActive: true },
      // a to z by name.
      orderBy: { name: 'asc' },
      // only the dropdown fields.
      select: SUBJECT_OPTION_SELECT,
    });
  }

  // gives every active level in the order the admin chose (sort_order), for example beginner, intermediate, advanced.
  // when two levels have the same sort_order, the older one (smaller id) comes first, so the order never jumps around.
  async listActiveLevels(): Promise<LevelOption[]> {
    return this.prisma.level.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: LEVEL_OPTION_SELECT,
    });
  }
}