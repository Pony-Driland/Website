# API Documentation

This document describes the WebSocket events used for managing user permissions within chat rooms.

Documentation written with the assistance of OpenAI's ChatGPT.

## Events

### `exists-room`

#### Description

Checks whether a room with the provided `roomId` exists. Requires a valid user session and a valid `roomId`. This is a non-intrusive check that does not attempt to join or modify the room.

#### Parameters

- `roomId` _(string, required)_: The unique identifier of the room to be checked.

#### Execution Flow

1. **Data Validation:**

   - Verifies that the `roomId` is a valid string.

2. **User Authentication:**

   - If no valid user is associated with the current socket, the function responds using `account not detect protocol` and exits.

3. **Room Existence Check:**

   - Calls room check to determine if the room exists in the current system.

4. **Return Result:**

   - Responds to the client using the provided callback `fn`, with an object:
     - `{ exists: true }` if the room exists.
     - `{ exists: false }` if the room does not exist.

#### Response

- Success:  
  Returns a response object:

  ```json
  { "exists": true | false }
  ```

- Failure:
  - If `roomId` is invalid: calls invalid data protocol.
  - If the user is not authenticated: calls no account protocol.

#### Example Usage

```js
socket.emit('exists-room', { roomId: 'abc123' }, (response) => {
  if (response.exists) {
    console.log('The room exists.');
  } else {
    console.log('Room not found.');
  }
});
```

---

### `join`

#### Description

Allows a user to join a specific room. Validates room credentials, room availability, and permissions before adding them.

#### Parameters

- `roomId` _(string, required)_: The unique identifier of the room to join.
- `password` _(string, optional)_: The room's password, if required.

#### Execution Flow

1. **Data Validation:**

   - The `roomId` and `password` values are checked to ensure they are valid (e.g., `roomId` should be a string, and `password` should be a string).

2. **User Authentication:**

   - The user's ID is fetched for data verification. If no user is detected, an error response is sent.

3. **Rate Limiting:**

   - A check is performed to determine if the user has exceeded the rate limit for joining rooms. If the user is rate-limited, the function returns early.

4. **Room Validation:**
   - The function checks if the room exists by attempting to retrieve it from the `rooms`. If the room is not found, an error message with code `1` ("Room not found") is returned.
5. **Password Validation:**

   - If the room requires a password, it is validated against the password provided by the user. If incorrect, an error message with code `2` ("Incorrect room password") is returned.

6. **Room Capacity Check:**

   - The function checks if the room is full by comparing the number of users in the room with the room's maximum capacity. If the room is full, an error message with code `3` ("Room is full") is returned.

7. **Room Disabled Check:**

   - If the room is disabled, and the user is not the server owner or a moderator, or the user is not the room owner, an error message with code `4` ("Room is disabled") is returned.

8. **Banned Users Check:**

   - The function checks if the user is banned from the room. If the user is banned, an error message with code `5` ("You're banned") is returned.

9. **Add User to Room:**

   - If all checks pass, the user is added to the room.

10. **Send Room History and Settings:**

    - The room's chat history is retrieved. If no history exists, a new one is created and associated with the room.
    - The user is sent the following data:
      - `room-entered`: Data received to load the room on the user page.

11. **Complete Room Join:**
    - The user is successfully joined to the room.

#### Response

- Success: Emits the room user list, history, and settings to the user.
- Failure: Returns an error object with a code:
  - `1`: Room not found.
  - `2`: Incorrect room password.
  - `3`: Room is full.
  - `4`: Room is disabled.
  - `5`: User is banned.

---

### `leave`

#### Description

Allows a user to leave a room, handling necessary cleanup and validation.

#### Parameters

- `roomId` _(string, required)_: The unique identifier of the room to leave.

#### Process

1. Validates `roomId`.
2. Retrieves the user ID from the session.
3. Calls `leaveRoom()` to process the exit.
4. Returns a success or failure response.

#### Response

- Success: `{ success: true }`
- Failure: Returns an error object with a code:
  - `1`: No users in the room.
  - `2`: User is not in the room.
  - `3`: Invalid data.

---

### `ban-from-room`

#### Description

Bans a user from a specific room, preventing them from rejoining.

#### Payload

```json
{
  "userId": "string",
  "roomId": "string"
}
```

#### Response

- **Success**:
  ```json
  {
    "success": true
  }
  ```
- **Error**:
  ```json
  {
    "error": true,
    "msg": "Error message",
    "code": <error_code>
  }
  ```

#### Error Codes

| Code | Message        |
| ---- | -------------- |
| 1    | Room not found |
| 2    | Not authorized |
| 3    | User not found |

#### Behavior

1. Validates the provided `userId` and `roomId`.
2. Ensures the request is from a logged-in user.
3. Checks if the room exists.
4. Verifies if the requester has permission to ban users.
5. Adds the user to the room’s ban list.
6. Emits the `user-banned` event to notify all users in the room.
7. Forces the banned user to leave the room.

---

### `unban-from-room`

#### Description

Removes a user from the ban list, allowing them to rejoin the room.

#### Payload

```json
{
  "userId": "string",
  "roomId": "string"
}
```

#### Response

- **Success**:
  ```json
  {
    "success": true
  }
  ```
- **Error**:
  ```json
  {
    "error": true,
    "msg": "Error message",
    "code": <error_code>
  }
  ```

#### Error Codes

| Code | Message        |
| ---- | -------------- |
| 1    | Room not found |
| 2    | Not authorized |
| 3    | User not found |

#### Behavior

1. Validates the provided `userId` and `roomId`.
2. Ensures the request is from a logged-in user.
3. Checks if the room exists.
4. Verifies if the requester has permission to unban users.
5. Removes the user from the room’s ban list.

---

### `kick-from-room`

#### Description

Removes a user from a room without banning them, allowing them to rejoin later.

#### Payload

```json
{
  "userId": "string",
  "roomId": "string"
}
```

#### Response

- **Success**:
  ```json
  {
    "success": true
  }
  ```
- **Error**:
  ```json
  {
    "error": true,
    "msg": "Error message",
    "code": <error_code>
  }
  ```

#### Error Codes

| Code | Message        |
| ---- | -------------- |
| 1    | Room not found |
| 2    | User not found |
| 3    | Invalid data   |
| 4    | Not authorized |

#### Behavior

1. Validates the provided `userId` and `roomId`.
2. Ensures the request is from a logged-in user.
3. Checks if the room exists.
4. Verifies if the requester has permission to kick users.
5. Removes the user from the room.
6. Emits the `user-kicked` event to notify all users in the room.

---

## Permission Levels

| Role                 | Ban Users | Unban Users | Kick Users |
| -------------------- | --------- | ----------- | ---------- |
| **Server Owner**     | ✅        | ✅          | ✅         |
| **Server Moderator** | ✅        | ✅          | ✅         |
| **Room Owner**       | ✅        | ✅          | ✅         |
| **Room Moderator**   | ✅        | ✅          | ✅         |
| **Regular User**     | ❌        | ❌          | ❌         |

---

## Events Emitted

| Event Name    | Description                                       |
| ------------- | ------------------------------------------------- |
| `user-banned` | Notifies users in a room that someone was banned. |
| `user-kicked` | Notifies users in a room that someone was kicked. |

---

## Notes

- **Rate limiting**: Requests are subject to rate limits to prevent abuse.
- **Authentication required**: Only logged-in users can perform these actions.
- **Error handling**: The API returns specific error codes for better debugging.

This documentation provides a structured overview of the available room moderation actions. If additional functionality is required, please update accordingly.

---

### `create-room`

**Description:** Creates a new chat room.

#### Payload

```json
{
  "roomId": "string",
  "password": "string",
  "title": "string"
}
```

#### Response

- **Success:**
  ```json
  { "success": true }
  ```
- **Error:** Room already exists
  ```json
  { "error": true, "msg": "This room already exists.", "code": 1 }
  ```

#### Conditions:

- Only logged-in users can create rooms.
- Room ID, password, and title must be strings.
- A rate limit check is performed.

---

### `delete-room`

**Description:** Deletes an existing room.

#### Payload

```json
{
  "roomId": "string"
}
```

#### Response

- **Success:**
  ```json
  { "success": true }
  ```
- **Error:**
  - Room not found:
    ```json
    { "error": true, "msg": "Room not found.", "code": 1 }
    ```
  - Insufficient permissions:
    ```json
    { "error": true, "msg": "You are not allowed to do this.", "code": 2 }
    ```

#### Conditions:

- Only logged-in users can delete rooms.
- Only the **server owner**, **server moderators**, or the **room owner** can delete a room.
- All users in the room will be disconnected upon deletion.
- Related room data (history, private data, etc.) is removed.

---

### `disable-room`

**Description:** Disables a room, preventing new activity.

#### Payload

```json
{
  "roomId": "string"
}
```

#### Response

- **Success:**
  ```json
  { "success": true }
  ```
- **Error:**
  - Room not found:
    ```json
    { "error": true, "msg": "Room not found.", "code": 1 }
    ```
  - Insufficient permissions:
    ```json
    { "error": true, "msg": "You are not allowed to do this.", "code": 2 }
    ```

#### Conditions:

- Only logged-in users can disable rooms.
- Only the **server owner**, **server moderators**, or the **room owner** can disable a room.
- All users in the room will be disconnected.

---

### `enable-room`

**Description:** Re-enables a previously disabled room.

#### Payload

```json
{
  "roomId": "string"
}
```

#### Response

- **Success:**
  ```json
  { "success": true }
  ```
- **Error:**
  - Room not found:
    ```json
    { "error": true, "msg": "Room not found.", "code": 1 }
    ```
  - Insufficient permissions:
    ```json
    { "error": true, "msg": "You are not allowed to do this.", "code": 2 }
    ```

#### Conditions:

- Only logged-in users can enable rooms.
- Only the **server owner**, **server moderators**, or the **room owner** can enable a room.

---

## Notes

- All actions require a valid user session.
- The system enforces rate limiting to prevent abuse.
- If a room is **disabled**, users are automatically disconnected.
- **Deleting a room** permanently removes all related data.

## Events

### `room-add-mod`

**Description:**
Adds moderators to a room. Only the room owner or the server owner can perform this action.

**Payload:**

```json
{
  "roomId": "<room_id>",
  "mods": ["<user_id>", "<user_id>"]
}
```

**Response:**

```json
{
  "success": true
}
```

**Error Responses:**

- `{ "error": true, "msg": "Room not found.", "code": 1 }` - If the specified room does not exist.
- `sendIncompleteDataInfo(fn)` - If `roomId` is not a string or `mods` is not an array.
- `accountNotDetected(fn)` - If the user is not logged in.
- `ownerOnly(fn, 2)` - If the user is neither the room owner nor the server owner.

**Behavior:**

1. Validates input data (`roomId` must be a string, `mods` must be an array).
2. Retrieves the user ID from the session.
3. Checks if the user is logged in and not rate-limited.
4. Retrieves the room data.
5. Verifies if the user is the room owner or the server owner.
6. Adds new moderators from `mods` if they are not already moderators and exist in the room users list.
7. Updates the room data and notifies all users in the room via `room-mod-updated` event.
8. Returns a success response.

---

### `room-remove-mod`

**Description:**
Removes moderators from a room. Only the room owner or the server owner can perform this action.

**Payload:**

```json
{
  "roomId": "<room_id>",
  "mods": ["<user_id>", "<user_id>"]
}
```

**Response:**

```json
{
  "success": true
}
```

**Error Responses:**

- `{ "error": true, "msg": "Room not found.", "code": 1 }` - If the specified room does not exist.
- `sendIncompleteDataInfo(fn)` - If `roomId` is not a string or `mods` is not an array.
- `accountNotDetected(fn)` - If the user is not logged in.
- `ownerOnly(fn, 2)` - If the user is neither the room owner nor the server owner.

**Behavior:**

1. Validates input data (`roomId` must be a string, `mods` must be an array).
2. Retrieves the user ID from the session.
3. Checks if the user is logged in and not rate-limited.
4. Retrieves the room data.
5. Verifies if the user is the room owner or the server owner.
6. Removes moderators listed in `mods` from the room's moderator list.
7. Updates the room data and notifies all users in the room via `room-mod-updated` event.
8. Returns a success response.

---

### `update-room`

#### Description

Updates the settings of a specific room. Only the room owner or the server owner can perform this action.

#### Payload

```json
{
  "roomId": "string",
  "newSettings": {
    "title": "string",
    "password": "string",
    "maxUsers": "number"
  }
}
```

#### Response

- **Success:**
  ```json
  { "success": true }
  ```
- **Error:**
  ```json
  { "error": true, "msg": "Error message", "code": number }
  ```

#### Validation & Rules

- The user must be **logged in**.
- The user must be the **room owner** or **server owner**.
- The room must exist.
- Allowed updates:
  - **`title`**: Limited to `ROOM_TITLE_SIZE` characters.
  - **`model`**: Limited to `MODEL_ID_SIZE` characters.
  - **`maxOutputTokens`**: Is a REAL value in SQL.
  - **`temperature`**: Is a REAL value in SQL.
  - **`topP`**: Is a REAL value in SQL.
  - **`topK`**: Is a REAL value in SQL.
  - **`presencePenalty`**: Is a REAL value in SQL.
  - **`frequencyPenalty`**: Is a REAL value in SQL.
  - **`password`**: Limited to `PASSWORD_SIZE_LIMIT` characters.
  - **`maxUsers`**: Must be a finite number between `1` and `MAX_USERS_PER_ROOM`.
- If updates are applied, all users in the room will receive an `room-updated` event.

#### Example Usage

```javascript
socket.emit(
  'update-room',
  { roomId: '123', newSettings: { title: 'New Room Title' } },
  (response) => {
    console.log(response);
  },
);
```

---

### `update-room-data`

#### Description

Updates additional room data, either public or private, depending on the request.

#### Payload

```json
{
  "roomId": "string",
  "isPrivate": "boolean",
  "values": { "key": "value" }
}
```

#### Response

- **Success:**
  ```json
  { "success": true }
  ```
- **Error:**
  ```json
  { "error": true, "msg": "Error message", "code": number }
  ```

#### Validation & Rules

- The user must be **logged in**.
- The user must be the **room owner** or **server owner**.
- The room must exist.
- If `isPrivate` is `true`, updates are stored in `privateRoomData`, and only the sender receives an update.
- If `isPrivate` is `false`, updates are stored in `roomData`, and all users in the room receive an update.

#### Example Usage

```javascript
socket.emit(
  'update-room-data',
  { roomId: '123', isPrivate: false, values: { topic: 'Gaming' } },
  (response) => {
    console.log(response);
  },
);
```
