# StudyCircle — Peer Study Group Finder

**Database Schema — MVP Version 1**

This document shows every table planned for the **MVP (first 3 months)** of the StudyCircle project (Next.js + NestJS + PostgreSQL + Prisma). It is written in plain, easy-to-follow language, in the same style as the Online Clothing Brand schema.

> **This is NOT the final schema.** It is a living document. It will keep changing as the team builds and as new features are added after the 3-month deadline. When the schema changes in a real way, update this file and give the new version a new number (v2, v3, and so on).

**How to read this document:** Each table lists its columns, the data type used to store the value, and a plain-language note on what the column is for. In the Type column, **PK** means primary key (the column that uniquely identifies each row). **FK** means foreign key (a column that points to a row in another table). Types are written in PostgreSQL style. Enums (a fixed list of allowed words) are written like `enum('a','b')`.

**Written:** 30 October 2026. **Revised:** 30 October 2026 (group posts replace announcements, and a group setting decides who can post). **Scope:** MVP only, with real-time group chat included. Features planned for later are listed in Section 10, and they are not in these tables yet.

## Contents

1. Users & Authentication
2. Subjects & Levels
3. Groups & Membership
4. Study Sessions & Reviews
5. Group Space: Chat, Posts & Files
6. Notifications
7. Moderation & Admin
8. Entity Relationship Summary
9. Indexing & Design Notes
10. Not in This MVP Schema Yet
11. Open Decisions

---

## Version Notes (What This Schema Assumes)

These are the team choices this schema is built on. If a choice changes, the schema changes with it.

| Choice | What it means for the tables |
|---|---|
| "Looking for partners" posts are **removed** | No posts table. A student with no search result creates a group instead. |
| Posts exist **only inside groups**. There is **no global feed**. | A small `group_posts` table. The leader can always post. Other members can post only when the group setting `members_can_post` is on. |
| Text notes are replaced by a **files section** | A `group_files` table. No notes table. |
| **Reviews** are kept | A `reviews` table (1 to 5 stars per session). |
| **Chat is in the MVP** | A `messages` table, saved in PostgreSQL and sent live over WebSocket. |
| Groups use **approval only** | No "group type" column yet. Every join goes through a request. |
| **Level** is self-declared and optional | A `levels` table with a short description for each level. |
| A "leader" is **not** a global role | The global role is only `student` or `admin`. Leader is a role inside one group. |
| A group has **one leader at a time**. No co-leader. | Any active member can become the leader. If the leader leaves, the longest-standing active member is promoted. The leader can also hand leadership to any active member at any time. See "Leadership rules" in Section 3. |

**Total tables in this version: 17.**

---

## 1. Users & Authentication

This part stores who can use the site and how their login stays secure.

### users

One row for every person who has an account, both students and admins. The `role` column tells them apart, but real permission checks must always happen on the server, not just by trusting this label. A student becomes a group leader by creating a group, or by being given leadership of one later. That is stored in the groups tables, not here.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number given to this person. It never changes and is never reused. |
| `name` | `varchar(100)` | The name shown on the profile, in groups, and in chat. |
| `email` | `varchar(255), unique` | The email used to log in. No two accounts can share an email. SAFETY: never shown to other users. |
| `email_verified_at` | `timestamptz, nullable` | When the person confirmed their email. Left empty if email verification is not built yet. |
| `password_hash` | `varchar(255)` | The password saved in a scrambled (bcrypt hashed) form. The real password is never stored as plain text. |
| `role` | `enum('student','admin')` | Says whether this person is a student or the platform admin. |
| `status` | `enum('active','suspended')` | An admin can suspend an account. A suspended person cannot log in. Unsuspending sets the status back to `active`. There is no separate status for it. |
| `department` | `varchar(100), nullable` | The person's department, for example "CSE". Shown on the profile. |
| `academic_year` | `smallint, nullable` | The person's year of study, for example 1, 2, 3, or 4. |
| `bio` | `varchar(500), nullable` | A short text about the person. Optional. |
| `institution_id` | `integer, nullable` | **Reserved for the future.** Will point to a university or coaching center when the institution role is built. Always empty in the MVP, and it has no foreign key yet. |
| `created_at / updated_at` | `timestamptz` | When this account was created, and when it was last changed. |
| `deleted_at` | `timestamptz, nullable` | Filled in when an account is deleted. The row is hidden, not destroyed, so old groups, messages, and reviews still make sense. Empty while the account is live. A deleted account is marked here, not with a status value. |

### refresh_tokens

Lets a person stay logged in. The login token (JWT) lives for a short time. A refresh token is a longer-lived code that can ask for a new login token. One row is added every time one is handed out.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this refresh token. |
| `user_id` | `integer, FK -> users.id` | Who this token belongs to. |
| `token_hash` | `varchar(255), unique` | The scrambled form of the token. SAFETY: store only the hash, so a stolen database cannot be used to log in. |
| `expires_at` | `timestamptz` | When this token stops working. |
| `revoked_at` | `timestamptz, nullable` | Filled in when the token is cancelled, for example at logout. Empty while it is still valid. |
| `created_at` | `timestamptz` | When this token was created. |

---

## 2. Subjects & Levels

These small tables hold the lists that appear in filters and forms. Only the admin can change them.

### subjects

The topics students study, like "Data Structures" or "Calculus". Used in group forms, profile interests, and search filters.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this subject. |
| `name` | `varchar(150), unique` | The name shown to students, for example "Data Structures". |
| `category` | `varchar(100), nullable` | A bigger group the subject belongs to, for example "Computer Science". |
| `course_code` | `varchar(20), nullable` | A university course code, for example "CSC3215". Optional. |
| `is_active` | `boolean, default true` | Lets the admin hide a subject without deleting it. |
| `created_at / updated_at` | `timestamptz` | When this subject was created and last changed. |

### levels

The skill levels used on groups. Level is chosen by the group leader, not tested by the system.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this level. |
| `name` | `varchar(50), unique` | The name shown to students: "Beginner", "Intermediate", or "Advanced". |
| `description` | `varchar(255)` | A short note so everyone picks the same way, for example "New to the topic, starting from chapter 1." |
| `sort_order` | `smallint, default 0` | Controls the order in menus. Beginner shows first. |
| `is_active` | `boolean, default true` | Lets the admin hide a level without deleting it. |
| `created_at / updated_at` | `timestamptz` | When this level was created and last changed. |

### user_subjects

Links a student to the subjects they are interested in. One student can have many subjects, and one subject can have many students.

| Column | Type | What it means |
|---|---|---|
| `user_id` | `integer, PK (part 1), FK -> users.id` | The student. |
| `subject_id` | `integer, PK (part 2), FK -> subjects.id` | The subject they are interested in. Together with `user_id`, it makes one unique pair, so the same subject cannot be added twice. |
| `created_at` | `timestamptz` | When it was added. |

---

## 3. Groups & Membership

This is the heart of the project: the groups, who is inside them, and who is asking to get in.

### groups

One study group. It holds the details students search and filter by.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this group. |
| `subject_id` | `integer, FK -> subjects.id` | The subject this group studies. |
| `level_id` | `integer, FK -> levels.id, nullable` | The skill level. Optional, so a leader who is unsure can skip it. |
| `leader_id` | `integer, FK -> users.id` | The student who currently leads the group. It starts as the creator, and it changes when leadership is handed over or passed on automatically. Used for fast ownership checks. Always matches the one active `leader` row in `group_members`. |
| `institution_id` | `integer, nullable` | **Reserved for the future.** Always empty in the MVP, and it has no foreign key yet. |
| `title` | `varchar(150)` | The group name shown on the search page, for example "Beginner Data Structures — Midterm". |
| `topic` | `varchar(255), nullable` | The specific topic or chapters, for example "Linked lists and stacks". |
| `description` | `text` | A longer write-up: goal, rules, how the group will study. |
| `exam_date` | `date, nullable` | The exam the group is preparing for. Empty if the group is about a skill and not an exam. Groups with a past exam date are hidden from search. |
| `mode` | `enum('online','in_person')` | Whether the group meets online or in person. |
| `location` | `varchar(255), nullable` | Where an in-person group meets, or the area for an online one. Must be filled when the mode is `in_person` (checked in the code). |
| `max_size` | `smallint` | The most people the group can hold, including the leader. The allowed range (for example 2 to 30) is checked in the code. |
| `status` | `enum('active','closed','archived','removed')` | `active` = shown in search. `closed` = the leader finished the goal. `archived` = hidden but kept for history, and also set automatically when no active member is left. `removed` = taken down by an admin. |
| `is_flagged` | `boolean, default false` | An admin can flag a group for review without removing it. |
| `members_can_post` | `boolean, default false` | A group setting. When it is off, only the leader can post in the group's posts section. When it is on, any active member can post. The leader can change it at any time. Existing posts stay when it is switched off. |
| `created_at / updated_at` | `timestamptz` | When this group was created and last changed. |
| `deleted_at` | `timestamptz, nullable` | Filled in when a group is deleted. The row is hidden, not destroyed. Empty while the group is live. A deleted group is marked here, not with a status value. |

> **Seats left are calculated, not stored:** `max_size` minus the number of active members. This way the number can never go out of sync.

### group_members

Who belongs to a group. The leader also has a row here (with the role `leader`), so chat, files, and member checks use one simple table. When someone leaves or is removed, the row stays, so study history is never lost.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this membership. |
| `group_id` | `integer, FK -> groups.id` | The group. |
| `user_id` | `integer, FK -> users.id` | The member. |
| `role` | `enum('leader','member')` | The person's role **inside this group only**. Each group has exactly one active `leader`. |
| `status` | `enum('active','left','removed')` | `active` = currently inside. `left` = chose to leave. `removed` = removed by the leader. |
| `joined_at` | `timestamptz` | When the person became a member. It is set again to the new time when someone rejoins, so old seniority is not kept. It decides who is promoted next. |
| `left_at` | `timestamptz, nullable` | When the person left or was removed. Empty while active. |
| `removed_by` | `integer, FK -> users.id, nullable` | The leader who removed this person. Empty unless the status is `removed`. |

> **Rule:** one row per person per group. A person who leaves and later joins again reuses their old row (status goes back to `active`, `role` is `member`, and `joined_at` is set to the new time). The pair (`group_id`, `user_id`) is unique.

### Leadership rules

These rules are not a table. They explain how `groups.leader_id` and `group_members.role` change over time. Every change runs in **one database transaction**.

| Situation | What happens |
|---|---|
| A group is created | The creator is saved in `groups.leader_id` and gets a `group_members` row with the role `leader`. |
| The leader hands over leadership (any time) | The leader picks any active member. The old leader becomes `member`. The chosen person becomes `leader`. `groups.leader_id` changes. The new leader gets a `became_leader` notification. |
| The leader leaves the group | The longest-standing active member becomes the leader (see the order below). The old leader's row gets the status `left` and the role `member`. |
| The leader's account is suspended or deleted | Same promotion as when the leader leaves. |
| No other active member exists | The group is archived. |

**Who is promoted next:** sort the active members (not counting the leader who is going away) by `joined_at`, oldest first. If still tied, sort by `group_members.id`, lowest first. The first one wins.

**Safety rules:**
1. Only the current leader can hand over leadership, and only to an active member of that same group.
2. Lock the group row inside the transaction, so a handover and a "leader leaves" at the same moment cannot both win.
3. The database also refuses a second leader: a partial unique index on `group_members(group_id)` where `role = 'leader'` and `status = 'active'` (see Section 9).

### join_requests

A student asking to join a group. The leader approves or rejects it.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this request. |
| `group_id` | `integer, FK -> groups.id` | The group the student wants to join. |
| `user_id` | `integer, FK -> users.id` | The student asking. |
| `message` | `varchar(500), nullable` | A short note from the student to the leader, for example "I am in the same section and need help with trees." |
| `status` | `enum('pending','approved','rejected','cancelled')` | `pending` = waiting. `approved` = accepted. `rejected` = refused by the leader. `cancelled` = the student withdrew it. |
| `reviewed_by` | `integer, FK -> users.id, nullable` | The leader who answered. Empty while pending. |
| `review_note` | `varchar(500), nullable` | The reason when a request is rejected. Keeps the student from feeling ignored. |
| `reviewed_at` | `timestamptz, nullable` | When the leader answered. Used for the "reply within 24 hours" success number. |
| `created_at / updated_at` | `timestamptz` | When the request was sent and last changed. |

> **Rule:** a student can have only **one pending request per group** at a time. This stops request spam.

---

## 4. Study Sessions & Reviews

A session is one planned study meeting. The app organizes it (when, where, who is coming). It does not run the meeting itself. Online sessions use a meeting link. In-person sessions use a place.

> **Naming note:** the table is called `study_sessions`, not `sessions`, to avoid mixing it up with login sessions.

### study_sessions

One planned meeting of a group.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this session. |
| `group_id` | `integer, FK -> groups.id` | The group this session belongs to. |
| `created_by` | `integer, FK -> users.id` | The leader who created it. |
| `title` | `varchar(150)` | The session name, for example "Linked list practice". |
| `topic` | `varchar(255), nullable` | What will be studied. |
| `description` | `text, nullable` | Extra details, like what to bring. |
| `scheduled_at` | `timestamptz` | The date and time the session starts. Stored in UTC and shown in the user's local time. |
| `duration_minutes` | `smallint, nullable` | How long it is planned to last. |
| `mode` | `enum('online','in_person')` | Online or in person. |
| `location` | `varchar(255), nullable` | The place, for in-person sessions. |
| `meeting_link` | `varchar(500), nullable` | The Meet or Zoom link, for online sessions. SAFETY: check that it is a proper web address, and open it in a new tab with safe link settings. |
| `status` | `enum('scheduled','completed','cancelled')` | The session's stage. |
| `cancel_reason` | `varchar(255), nullable` | Why the session was cancelled. Shown to members. |
| `created_at / updated_at` | `timestamptz` | When this session was created and last changed. |

### session_attendance

Tracks who said they will come, and who actually came. One row is created when a member clicks **"I will attend."** Removing the click deletes the row.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this record. |
| `session_id` | `integer, FK -> study_sessions.id` | The session. |
| `user_id` | `integer, FK -> users.id` | The member who clicked "I will attend." |
| `attended` | `boolean, nullable` | Filled in by the leader after the session. `true` = came, `false` = did not come, empty = not marked yet. |
| `created_at / updated_at` | `timestamptz` | When the person clicked, and when it was last changed. |

> **Rule:** one row per person per session. The pair (`session_id`, `user_id`) is unique.

### reviews

A rating a member leaves after a completed session. It helps leaders improve and helps admins spot weak groups.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this review. |
| `session_id` | `integer, FK -> study_sessions.id` | The session being reviewed. The group is found through this link. |
| `user_id` | `integer, FK -> users.id` | The member who wrote the review. |
| `rating` | `smallint` | A star rating from 1 to 5. The range is checked in the code (and can also be checked in the database). |
| `comment` | `varchar(500), nullable` | An optional short comment. |
| `created_at / updated_at` | `timestamptz` | When the review was written and last changed. |

> **Rules:** one review per person per session (the pair `session_id` and `user_id` is unique). Only members of that group can review. Only a session with the status `completed` can be reviewed. These last two rules are checked in the code.

---

## 5. Group Space: Chat, Posts & Files

This part is the shared space inside a group. **Only active members of a group can read or write here.** This is checked on the server for every request and for every WebSocket message.

### messages

One chat message in a group. Messages are saved in PostgreSQL first, then sent live to the other members over WebSocket. Old messages are loaded through a normal API call.

| Column | Type | What it means |
|---|---|---|
| `id` | `bigint, PK, auto-increment` | A unique number for this message. It uses a bigger number type because chat tables grow fast. |
| `group_id` | `integer, FK -> groups.id` | The group this message was sent in. |
| `user_id` | `integer, FK -> users.id` | Who sent the message. |
| `body` | `text` | The message text. The length limit (for example 2,000 characters) is checked in the code. SAFETY: always show it as plain text, never as HTML. |
| `created_at` | `timestamptz` | When the message was sent. |
| `deleted_at` | `timestamptz, nullable` | Filled in when a message is deleted (by the sender, the leader, or an admin). The row is hidden, not destroyed, so reports about it still work. |

> **No edit in the MVP,** so there is no `updated_at`. Message editing, replies, mentions, and unread counts are planned for later.

### group_posts

A post written inside one group, shown in the posts section at the top of the group page. **There is no global feed:** every post belongs to one group, and only active members of that group can read it. The leader can always post. Other members can post only when `groups.members_can_post` is on. Unlike chat, posts stay visible and do not get buried, and the leader can pin the important ones.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this post. |
| `group_id` | `integer, FK -> groups.id` | The group the post belongs to. |
| `author_id` | `integer, FK -> users.id` | The person who wrote it. This is the leader, or another member when `members_can_post` is on. |
| `title` | `varchar(150), nullable` | An optional short title. |
| `body` | `text` | The post text. The length limit is checked in the code. SAFETY: always show it as plain text, never as HTML. |
| `is_pinned` | `boolean, default false` | Only the leader can pin a post. Pinned posts show first. |
| `created_at / updated_at` | `timestamptz` | When it was posted and last changed. |
| `deleted_at` | `timestamptz, nullable` | Filled in when the author, the leader, or an admin deletes it. The row is hidden, not destroyed, so reports about it still work. |

> **No replies or comments in the MVP.** Talk about a post happens in the group chat. Replies are planned for later.

### group_files

A file shared inside a group, such as slides, a past paper, or a summary. Only members of that group can see or download it. The file itself is saved on the server (not in the database). This table only stores information about the file.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this file record. |
| `group_id` | `integer, FK -> groups.id` | The group this file belongs to. |
| `uploaded_by` | `integer, FK -> users.id` | The member who uploaded it. |
| `title` | `varchar(150)` | A name for the file shown in the list. |
| `description` | `varchar(500), nullable` | A short note about what is inside. |
| `original_name` | `varchar(255)` | The file name the person had, used only for display. SAFETY: never use this name to save the file. |
| `stored_name` | `varchar(255), unique` | The random name the server used to save the file. This stops name tricks and overwriting. |
| `mime_type` | `varchar(100)` | The checked file type. Only six are accepted: `application/pdf`, `image/png`, `image/jpeg`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX), `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX), and `text/plain`. |
| `size_bytes` | `integer` | The file size. The limit is 10 MB (10,485,760 bytes). It is checked before saving. |
| `created_at` | `timestamptz` | When the file was uploaded. |
| `deleted_at` | `timestamptz, nullable` | Filled in when the uploader or leader deletes the file. The row is hidden, and the real file can be cleaned up later. |

> **SAFETY rules for files:**
> 1. Allow only these types: PDF, PNG, JPEG, DOCX, PPTX, and plain text (TXT). Do not allow SVG, or the old `.doc` and `.ppt` formats. Check the real content, not just the name ending.
> 2. Save files in a **private** folder, never in a public folder.
> 3. Downloads go through a route that first checks "Is this person an active member of this group?"
> 4. Send downloads as attachments, so the browser does not run them.

---

## 6. Notifications

### notifications

A short message shown to a person in the bell icon, for example "Your request was approved." In the MVP, notifications are in-app only. Email notifications come later.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this notification. |
| `user_id` | `integer, FK -> users.id` | Who this notification is for. |
| `type` | `varchar(50)` | What kind of notification this is. See the list below. |
| `payload` | `jsonb` | The details, saved as a JSON object. Different types can store different details. |
| `read_at` | `timestamptz, nullable` | When the person opened it. Empty while it is still unread (used for the bell count). |
| `created_at` | `timestamptz` | When the notification was created. |

**Notification types in the MVP:**

| Type | Sent to | When |
|---|---|---|
| `join_request_received` | The group leader | A student sends a join request |
| `join_request_approved` | The student | The leader approves |
| `join_request_rejected` | The student | The leader rejects (includes the reason) |
| `session_created` | Group members | The leader schedules a session |
| `session_cancelled` | Group members | The leader cancels a session |
| `leader_post_created` | Group members | The leader posts in the group (posts by other members do not send a notification, to avoid noise) |
| `became_leader` | The new leader | Leadership is handed over to them, or they are promoted when the leader leaves |

> **Suggested payload keys for every type:** `group_id`, `group_title`, `message` (a short sentence), and `related_id` (the request, session, or post id). Keep the same keys across types, so the frontend stays simple.

---

## 7. Moderation & Admin

### reports

A complaint from a user about another user, a group, a message, a post, or a file. Admins review them in a queue.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this report. |
| `reported_by` | `integer, FK -> users.id` | The person who made the report. |
| `target_type` | `enum('user','group','message','file','post')` | What kind of thing is being reported. |
| `target_id` | `bigint` | The id of the reported thing. It is a big number type so it can point to messages too. |
| `reason` | `varchar(100)` | A short reason from a fixed list: `spam`, `harassment`, `inappropriate_content`, `impersonation`, or `other`. |
| `details` | `text, nullable` | Extra words from the reporter. |
| `status` | `enum('open','resolved','dismissed')` | `open` = waiting for an admin. `resolved` = the admin acted. `dismissed` = the admin found no problem. |
| `resolved_by` | `integer, FK -> users.id, nullable` | The admin who closed it. |
| `resolution_note` | `varchar(500), nullable` | What the admin did and why. |
| `resolved_at` | `timestamptz, nullable` | When the report was closed. |
| `created_at / updated_at` | `timestamptz` | When the report was made and last changed. |

> **No automatic link:** `target_type` and `target_id` are plain columns, so the database cannot check that the target exists. The code must check this before saving a report.

### admin_actions

A record of what an admin changed and when. It keeps the platform accountable and helps investigate problems later. It is append-only: rows are added, never edited.

| Column | Type | What it means |
|---|---|---|
| `id` | `integer, PK, auto-increment` | A unique number for this log entry. |
| `admin_id` | `integer, FK -> users.id` | The admin who did it. |
| `action` | `varchar(100)` | What they did, from a fixed list of 17 values: `suspended_user`, `unsuspended_user`, `deleted_user`, `removed_group`, `flagged_group`, `unflagged_group`, `resolved_report`, `dismissed_report`, `removed_post`, `removed_message`, `removed_file`, `created_subject`, `updated_subject`, `deactivated_subject`, `created_level`, `updated_level`, `deactivated_level`. Every admin change writes one row here. |
| `target_type` | `varchar(50)` | The kind of thing they changed, from a fixed list: `user`, `group`, `message`, `post`, `file`, `report`, `subject`, `level`. It has its own list because admins also act on reports, subjects, and levels, which the report targets do not include. |
| `target_id` | `bigint` | The id of the exact thing they changed. |
| `details` | `jsonb, nullable` | Extra details, such as the reason or the old and new values. |
| `created_at` | `timestamptz` | When the action happened. |

---

## 8. Entity Relationship Summary

A quick map of how the tables connect. "1" means one row, "many" means many rows can point back to that one row.

```
users (1) --- (many) refresh_tokens
users (many) --- (many) subjects [through user_subjects]
users (1) --- (many) groups [as leader_id]
users (1) --- (many) group_members
users (1) --- (many) join_requests [as the student]
users (1) --- (many) join_requests [as reviewed_by]
users (1) --- (many) study_sessions [as created_by]
users (1) --- (many) session_attendance
users (1) --- (many) reviews
users (1) --- (many) messages
users (1) --- (many) group_posts [as author_id]
users (1) --- (many) group_files [as uploaded_by]
users (1) --- (many) notifications
users (1) --- (many) reports [as reported_by]
users (1) --- (many) admin_actions [as admin_id]
subjects (1) --- (many) groups
levels (1) --- (many) groups
groups (1) --- (many) group_members
groups (1) --- (many) join_requests
groups (1) --- (many) study_sessions
groups (1) --- (many) messages
groups (1) --- (many) group_posts
groups (1) --- (many) group_files
study_sessions (1) --- (many) session_attendance
study_sessions (1) --- (many) reviews
reports (many) --- (1) any thing [user, group, message, post, file, by target_type + target_id, no automatic link]
admin_actions (many) --- (1) any thing [by target_type + target_id, no automatic link]
```

---

## 9. Indexing & Design Notes

General rules and reminders to follow when turning this schema into real Prisma models and migrations.

| | |
|---|---|
| **Naming** | Table names are plural and lowercase with underscores (snake_case), like `group_members`. Prisma model names are singular and in PascalCase, like `GroupMember`. Use `@@map` and `@map` to connect the two. |
| **Primary keys** | Auto-increasing whole numbers for most tables. `messages` uses a bigger number type. IDs in the address (like `/groups/12`) can be guessed, so **never rely on hiding an id**. Always check permissions on the server. If the team prefers random IDs (UUIDs), decide before the first migration. |
| **Foreign keys** | Always add a real foreign key rule with clear delete behavior. Examples: delete `refresh_tokens` and `user_subjects` automatically when the user is removed. For almost everything else, do not cascade. Use soft deletes instead, so history is never lost. |
| **Indexes to add** | `users.email` (unique), `groups(status, exam_date)`, `groups.subject_id`, `groups.level_id`, `groups.mode`, `group_members(group_id, user_id)` (unique), `group_members.user_id`, `group_members(group_id)` (partial unique, only where `role` is `leader` and `status` is `active`), `join_requests(group_id, status)`, `join_requests.user_id`, `study_sessions(group_id, scheduled_at)`, `session_attendance(session_id, user_id)` (unique), `reviews(session_id, user_id)` (unique), `messages(group_id, id)` for fast history loading, `group_posts(group_id, is_pinned, created_at)`, `notifications(user_id, read_at)`, `reports(status, created_at)`, `reports(target_type, target_id)`, `admin_actions(admin_id, created_at)`, `refresh_tokens.token_hash` (unique), `group_files.stored_name` (unique). |
| **One pending request** | The rule "one pending request per student per group" needs a **partial unique index** (unique only where status is `pending`). Prisma cannot write this by itself, so add it with a small hand-written SQL line inside the migration, or enforce it in the service code. Decide which one. |
| **One leader per group** | Add a **partial unique index** on `group_members(group_id)` where `role = 'leader'` and `status = 'active'`. Like the pending request rule, Prisma cannot write this by itself, so add it as a hand-written SQL line in the migration. It is the safety net: even if the code has a bug, the database refuses a second leader. Leadership changes also lock the group row, and promotion follows the order in "Leadership rules" (Section 3). |
| **Keeping group size safe** | Approving a request must run inside one **database transaction**: count active members, check against `max_size`, add the member, update the request, and create the notification. Use the `Serializable` isolation level (or lock the group row) so two approvals at the same moment cannot go over the size. Retry if the database reports a conflict. |
| **Two leader records** | The leader appears in `groups.leader_id` and in `group_members` (role `leader`). Create both inside the same transaction when a group is made. Change both inside one transaction whenever leadership changes (handover or auto-promote), so they never disagree. |
| **Soft deletes** | `users`, `groups`, `messages`, `group_posts`, and `group_files` have `deleted_at`. "Deleting" just hides the row. Always filter out rows where `deleted_at` is filled in. |
| **Hiding old groups** | Search only shows groups where `status` is `active` and `exam_date` is empty or today or later. This needs no scheduled job. A job to auto-archive can be added later. |
| **Time** | Store every date and time as `timestamptz` (UTC). Convert to the user's local time on the frontend. `exam_date` is a plain `date`. |
| **Enums** | Use Prisma enums for fixed lists (role, status, mode, and so on). Do not use free text. Adding a new value later needs a migration. |
| **Search** | Start with simple `contains` search on `title` and `topic`. If search gets slow, add a trigram index in PostgreSQL later. |
| **Pagination** | Always paginate. Search results use pages. Chat history uses a cursor (load messages older than a given `id`). |
| **Chat** | On every WebSocket connection **and** every sent message, check that the person is an active member of the group. When a member is removed, they must stop receiving and sending messages immediately. Apply a rate limit on messages. |
| **Posting rule** | The leader can always post. A member can post only when they are an active member **and** `groups.members_can_post` is true. Check this on the server, not only in the page. The author or the leader can delete a post. Only the leader can pin. An admin can remove a post through the reports queue. |
| **Privacy** | Emails and password hashes must never appear in any API response for other users. Use response shapes (DTOs or serializers) that list only safe fields. There is **no global feed**: every post belongs to one group, and only active members can read it. |
| **Checks done in code, not in the database** | `rating` between 1 and 5, `max_size` range, `location` required when mode is `in_person`, message length, allowed file types and size, only members can review or chat, only allowed members can post, review only after a session is `completed`, only the leader can hand over leadership and only to an active member of the same group. These can also be added as database checks later. |
| **Seed data** | Write seeders early, so the demo looks alive: 1 admin, about 30 students, 10 to 15 subjects, 3 levels, about 25 groups with members, sessions, messages, and files. Admin passwords come from `.env`, never from source code. |

---

## 10. Not in This MVP Schema Yet

These tables are planned for after the 3-month deadline. The MVP tables above are designed so these can be added without rebuilding anything.

| Later table or change | What it will be for |
|---|---|
| `password_reset_tokens` | Password reset by email (add in the MVP if time allows) |
| `email_verifications` | Email verification for new accounts |
| `user_availability` | Free time slots, for matching groups to a student's week |
| `user_blocks` | A student blocks another student |
| `group_invites` | Invite link and direct invite |
| `group_waitlist` | Waitlist for full groups |
| `group_topics` and `group_topic_progress` | Topic checklist with progress |
| `saved_searches` | Saved searches with alerts |
| `file_folders` | Organizing files by topic |
| `message_reads` | Unread message counts in chat |
| `post_replies` | Replies or comments under a group post (chat covers this in the MVP) |
| `direct_messages` | One-to-one chat between members |
| Recurring session columns | Weekly repeating sessions |
| `notification_preferences` and `email_queue` | Email notifications and user settings |
| `platform_notices` | One-way notices from the admin to all students, shown in the bell icon. It is not a feed. |
| `institutions` and `institution_members` | The institution role (the reserved `institution_id` columns will point here) |
| User reputation tables | Rating people, reliability badges |

---

## 11. Open Decisions

Things the team still needs to decide. Update this list as they are settled.

| # | Question | Why it matters |
|---|---|---|
| 1 | Integer IDs or random IDs (UUIDs)? | Changes every table. Best decided before the first migration. |
| 2 | How does a session become `completed`? By the leader pressing a button, or automatically after its time passes? | Reviews only work on completed sessions. |
| 3 | Can a removed member ask to join the same group again? | Changes the join request rules. |
| 4 | Where are files saved in the MVP? On the server disk, or in cloud storage? | Changes the `group_files` code, not the table. |
| 5 | Will email verification be in the MVP? | Decides if `email_verified_at` is used. |
| 6 | Which partial unique index approach for pending requests: SQL in the migration or a service check? | Decided once, then follow it everywhere. |
| 7 | Who switches `members_can_post` on or off? This file assumes the **group leader**. If the platform admin should control it instead, the check and the admin screen change. | Decides the permission check for posting. |
| 8 | Does a new leader have to accept a handover? This file assumes **no**: the change is instant and the new leader gets a notification. | Decides if a pending-handover state is needed. |

---

This is the reference schema for the **StudyCircle MVP**. It is a starting point, not a final design. Adjust types, nullability, and rules as the team builds, and re-generate this document whenever the schema changes in a real way.
