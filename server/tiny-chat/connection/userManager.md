# API Documentation

This document provides an overview of the events handled by the server, including user management actions such as banning, unbanning, kicking, logging in, and registration.

Documentation written with the assistance of OpenAI's ChatGPT.

---

## Events Overview

### 1. `ban`

#### Description:

This event allows the server owner or moderators to ban a user from the server. The user will be disconnected, and their information will be added to the ban list.

#### Arguments:

- `userId` (string): The ID of the user to ban.
- `reason` (string): The reason for the ban.

#### Callback:

- Success: `{ success: true }`
- Error: `{ error: true, msg: string, code: number }`

#### Behavior:

- Validates the `userId` and `reason`.
- Checks if the sender is logged in and not rate-limited.
- Ensures the sender is either the server owner or a moderator.
- Disconnects the banned user and adds them to the ban list.

---

### 2. `unban`

#### Description:

This event allows the server owner or moderators to remove a user from the ban list, allowing them to reconnect.

#### Arguments:

- `userId` (string): The ID of the user to unban.

#### Callback:

- Success: `{ success: true }`
- Error: `{ error: true, msg: string, code: number }`

#### Behavior:

- Validates the `userId`.
- Checks if the sender is logged in and not rate-limited.
- Ensures the sender is either the server owner or a moderator.
- Removes the user from the ban list.

---

### 3. `kick`

#### Description:

This event allows the server owner or moderators to kick a user from the server. The user will be disconnected, but they can rejoin later.

#### Arguments:

- `userId` (string): The ID of the user to kick.

#### Callback:

- Success: `{ success: true }`
- Error: `{ error: true, msg: string, code: number }`

#### Behavior:

- Validates the `userId`.
- Checks if the sender is logged in and not rate-limited.
- Ensures the sender is either the server owner or a moderator.
- Disconnects the user.

---

### 4. `change-password`

#### Description:

This event allows a logged-in user to change their password.

#### Arguments:

- `password` (string): The new password.
- `oldPassword` (string): The current password.

#### Callback:

- Success: `{ success: true }`
- Error: `{ error: true, msg: string, code: number }`

#### Behavior:

- Validates the `password`.
- Checks if the sender is logged in and not rate-limited.
- Updates the user's password after hashing it.

---

### 5. `change-nickname`

#### Description:

This event allows a logged-in user to change their nickname.

#### Arguments:

- `nickname` (string): The new nickname.

#### Callback:

- Success: `{ nickname: string }`
- Error: `{ error: true, msg: string, code: number }`

#### Behavior:

- Validates the `nickname`.
- Checks if the sender is logged in and not rate-limited.
- Updates the user's nickname.
- Sends the user's nickname update to all rooms using the event `user-updated`.

---

### 6. `register`

#### Description:

This event allows a new user to register an account on the server.

#### Arguments:

- `userId` (string): The desired user ID.
- `password` (string): The desired password.
- `nickname` (string): The desired nickname.

#### Callback:

- Success: `{ userId: string, nickname: string }`
- Error: `{ error: true, msg: string, code: number }`

#### Behavior:

- Validates the `userId`, `password`, and `nickname`.
- Checks if registration is open and if the sender is the server owner.
- Creates a new user account if the user ID is not already taken.

---

### 7. `login`

#### Description:

This event allows an existing user to log in using their credentials.

#### Arguments:

- `userId` (string): The user ID.
- `password` (string): The password.

#### Callback:

- Success: `{ userId: string, nickname: string }`
- Error: `{ error: true, msg: string, code: number }`

#### Behavior:

- Validates the `userId` and `password`.
- Checks if the user is banned.
- Ensures the user is not already logged in or using the account elsewhere.
- Sets up the user's session and stores their connection in `userSockets`.

---

### 8. `user-is-mod`

#### Description:

This event checks if a specific user is a moderator.
It can also return additional moderator details when requested by another moderator or the server owner.

#### Arguments:

- `userId` (string): The ID of the user to check.

#### Callback:

- Success (user is moderator):
  `{ result: true, isOwner: boolean, date?: string, reason?: string }`
  The optional `date` and `reason` fields are only returned if the requester is a moderator or the server owner.
- Success (user is not moderator):
  `{ result: false, isOwner: boolean }`
- Error: `{ error: true, msg: string, code: number }`

#### Behavior:

- Validates the `userId`.
- Ensures the requester is logged in and not rate-limited.
- Queries the `moderators` table for both the requester and the target user.
- If the target user is a moderator, returns `{ result: true, isOwner: boolean }`.
- If the requester is a moderator or the owner, includes `date` and `reason` metadata about the moderator status.
- Otherwise, returns `{ result: false, isOwner: boolean }` if the user is not found among moderators.

---

### 9. `user-is-owner`

#### Description:

This event checks if a given user is the server owner.

#### Arguments:

- `userId` (string): The ID of the user to check.

#### Callback:

- Success: `{ result: boolean }`
  - `true` if the user is the owner.
  - `false` otherwise.

- Error: `{ error: true, msg: string, code: number }`

#### Behavior:

- Validates the `userId`.
- Ensures the requester is logged in and not rate-limited.
- Compares the `userId` against the configured `OWNER_ID` from the server settings.
- Returns the result as a boolean flag.

---

## Conclusion

This API provides comprehensive user management functionality, covering registration, authentication, moderation tools (ban, unban, kick), and permission checks (owner/moderator detection).
All operations include input validation, rate-limiting protection, and role-based access control to maintain a secure and consistent environment for both users and administrators.
