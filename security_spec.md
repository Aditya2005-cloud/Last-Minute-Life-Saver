# Security Specification - DeadlineGenie AI

This specification details the security invariants, threat vectors, and test cases designed to protect our users' data using Attribute-Based Access Control (ABAC) in Google Cloud Firestore.

## 1. Data Invariants

1. **Strict User Ownership (Isolation)**: Users are strictly forbidden from reading, listing, creating, updating, or deleting any documents inside any other user's root space (`/users/{userId}/**`).
2. **Identity Integrity**: For any write operation on `tasks`, `habits`, or `schedule`, the document's `userId` field must match `request.auth.uid`.
3. **Temporal Integrity**: The `createdAt` timestamp must be set to `request.time` on creation and remain immutable. The `updatedAt` timestamp must equal `request.time` on updates.
4. **Alphanumeric ID Safety**: Path variables must match `^[a-zA-Z0-9_\-]+$` and have a safe length (<= 128 characters) to prevent resource-exhaustion and ID-poisoning attacks.
5. **Bound Lists**: Nested arrays, checklists, and items lists must be bounded in length (size <= 100) to prevent denial-of-wallet / memory exhaustion.
6. **Strict Schema Type Validation**: Every update or write must conform to its entity definitions, checking enums and integer boundaries.
7. **Verified Auth Gate**: Standard write operations must require the user to be signed in with an email-verified account (`request.auth.token.email_verified == true`).

---

## 2. The "Dirty Dozen" Payloads

Here are twelve highly dangerous payloads that our ruleset must actively block:

### Payload 1: Cross-Tenant Read (Identity Theft)
An attacker tries to retrieve tasks belonging to user `victim_123`.
- **Target Path**: `/users/victim_123/tasks/some_task`
- **Auth User**: `attacker_456`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 2: Cross-Tenant Write (Data Injection)
An attacker tries to create a task in user `victim_123`'s collection.
- **Target Path**: `/users/victim_123/tasks/evil_task`
- **Auth User**: `attacker_456`
- **Payload**: `{ "id": "evil_task", "userId": "victim_123", "title": "Phishing Attempt", "dueDate": "2026-12-31", "importance": "high", "estimatedMinutes": 10, "completed": false }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 3: Identity Spoofing (UID Hijacking)
An attacker writes to their own path but sets the payload's `userId` field to `victim_123` to cause database pollution or query bypass.
- **Target Path**: `/users/attacker_456/tasks/spoofed_task`
- **Auth User**: `attacker_456`
- **Payload**: `{ "id": "spoofed_task", "userId": "victim_123", "title": "Spoofed Owner", "dueDate": "2026-12-31", "importance": "high", "estimatedMinutes": 10, "completed": false }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 4: Invalid Enum Values (Type Defiance)
Writing an unsupported task importance value.
- **Target Path**: `/users/attacker_456/tasks/task_invalid_enum`
- **Auth User**: `attacker_456`
- **Payload**: `{ "id": "task_invalid_enum", "userId": "attacker_456", "title": "Rogue Enum", "dueDate": "2026-12-31", "importance": "URGENT_PANIC_NOW", "estimatedMinutes": 10, "completed": false }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 5: Creation Timestamp Spoofing (History Rewriting)
An attacker sets `createdAt` to a historical or future date instead of `request.time`.
- **Target Path**: `/users/attacker_456/tasks/timestamp_spoof`
- **Auth User**: `attacker_456`
- **Payload**: `{ "id": "timestamp_spoof", "userId": "attacker_456", "title": "Fake Past", "dueDate": "2026-12-31", "importance": "high", "estimatedMinutes": 10, "completed": false, "createdAt": "2020-01-01T00:00:00Z" }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 6: Immutability Break (Modifying Creation History)
An attacker attempts to change the immutable `createdAt` field on an existing task.
- **Target Path**: `/users/attacker_456/tasks/existing_task`
- **Auth User**: `attacker_456`
- **Original Document**: `{ "id": "existing_task", "userId": "attacker_456", "title": "Real Task", "dueDate": "2026-12-31", "importance": "high", "estimatedMinutes": 10, "completed": false, "createdAt": "2026-06-26T12:00:00Z" }`
- **Payload (Update)**: `{ "id": "existing_task", "userId": "attacker_456", "title": "Real Task", "dueDate": "2026-12-31", "importance": "high", "estimatedMinutes": 10, "completed": false, "createdAt": "2020-01-01T00:00:00Z" }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 7: Denial-of-Wallet Array Attack (Memory Exhaustion)
An attacker inputs a humongous checklist array to cause Firestore document ballooning.
- **Target Path**: `/users/attacker_456/tasks/huge_list`
- **Auth User**: `attacker_456`
- **Payload**: `{ "id": "huge_list", "userId": "attacker_456", "title": "Bloated", "dueDate": "2026-12-31", "importance": "high", "estimatedMinutes": 10, "completed": false, "breakdown": { "estimatedMinutesTotal": 10, "tacticalSteps": [], "requiredResources": ["A", "B", "C"], "reasoningSteps": ["Step 1", "Step 2"], "immediateFirstStep": "Do this", "completedChecklist": ["x", "y", "z"] } }` where arrays are bloated over size limit constraints.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 8: Path ID Poisoning (Junk Character Strings)
An attacker attempts to register a document using a hazardous path ID containing special characters or giant length.
- **Target Path**: `/users/attacker_456/tasks/$$$---evil-inject---$$$`
- **Auth User**: `attacker_456`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 9: Unverified User Access (Security Bypass)
An attacker logged in with an unverified email tries to mutate data.
- **Target Path**: `/users/attacker_456/tasks/unverified_task`
- **Auth User**: `attacker_456` (email_verified = false)
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 10: Habit Frequency Violation
Attempting to save a Habit with an invalid frequency value.
- **Target Path**: `/users/attacker_456/habits/habit_invalid_enum`
- **Auth User**: `attacker_456`
- **Payload**: `{ "id": "habit_invalid_enum", "userId": "attacker_456", "name": "Work out", "frequency": "every_second_hour", "completedDates": [], "streak": 0 }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 11: Calendar Event Start-End Swap
An attacker attempts to set an invalid calendar focus block where start time occurs after end time.
- **Target Path**: `/users/attacker_456/schedule/invalid_block`
- **Auth User**: `attacker_456`
- **Payload**: `{ "id": "invalid_block", "userId": "attacker_456", "title": "Focus time", "startTime": "2026-06-26T18:00:00Z", "endTime": "2026-06-26T12:00:00Z", "isExternal": false }`
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 12: Blanket Read Scraping (Mass Query Extractor)
Querying the entire `tasks` collection globally without specifying a `where` user filter clause, trying to scrape other users' info.
- **Target Path**: `/users/{userId}/tasks` (unrestricted list access)
- **Expected Outcome**: `PERMISSION_DENIED`

---

## 3. The Test Suite Strategy

Our tests verify security integrity against the above threat models, ensuring that zero-trust boundaries cannot be breached.
