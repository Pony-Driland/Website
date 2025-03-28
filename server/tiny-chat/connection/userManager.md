# API Documentation

This document provides an overview of the events handled by the server, including user management actions like ban, unban, kick, login, and registration.

Documentation written with the assistance of OpenAI's ChatGPT.

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

## Conclusion

This API provides basic user management functionality, including account creation, login, banning, unbanning, kicking, and changing user details such as password and nickname. It also includes validation and permissions checks to ensure that only authorized users (such as server owners and moderators) can perform certain actions.
