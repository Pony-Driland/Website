# API Documentation

## Overview

This document describes the available Socket.IO events and their functionalities in the system. Each event processes specific actions related to messaging, room management, and dice rolling.

Documentation written with the assistance of OpenAI's ChatGPT.

## Events

### `send-message`

**Description:**
Sends a message to a specific room, updating the message history and notifying other users.

**Payload:**

```json
{
  "message": "string", // The text of the message
  "roomId": "string", // The room where the message should be sent
  "tokens": "number", // Number of content tokens
  "model": "string", // Model used to generate the token amount
  "errorCode": "string" // Error code sent by content generator
}
```

**Acknowledgment Response:**

```json
{
  "id": "number", // The message index
  "date": "number" // Timestamp of the message
}
```

**Error Codes:**

- `1`: Message exceeds size limit.
- `2`: Room not found.
- `3`: The message Id is already being used.

---

### `edit-message`

**Description:**
Edits an existing message in a room, provided the user has the necessary permissions.

**Payload:**

```json
{
  "roomId": "string", // The ID of the room
  "messageId": "string", // The ID of the message to be edited
  "newText": "string", // The new content of the message
  "tokens": "number", // Number of content tokens
  "model": "string", // Model used to generate the token amount
  "errorCode": "string" // Error code sent by content generator
}
```

**Acknowledgment Response:**

```json
{
  "edited": "number" // Timestamp of the edit
}
```

**Error Codes:**

- `1`: Room not found.
- `2`: Message exceeds size limit.
- `3`: Message not found.
- `4`: User lacks permission.

---

### `delete-message`

**Description:**
Deletes a message from the room history if the user has the necessary permissions.

**Payload:**

```json
{
  "roomId": "string", // The ID of the room
  "messageId": "string" // The ID of the message to be deleted
}
```

**Acknowledgment Response:**

```json
{
  "success": true
}
```

**Error Codes:**

- `1`: Room not found.
- `2`: Message not found.
- `3`: User lacks permission.

---

### `roll-dice`

**Description:**

Rolls one or more virtual dice in a chat room. Users can configure whether dice rolls include zero as a possible result (`canZero`), and whether all dice have the same number of sides (`sameSides`). The result is shared with all users in the room and can include personalized dice skins.

**Payload:**

```json
{
  "sameSides": true, // (Required) If true, all dice use the first value as the number of sides
  "canZero": false, // (Required) If true, rolls can include zero (e.g., 0 to N-1)
  "dice": [4, 4, 4], // (Required) Array of numbers indicating dice sides or count
  "roomId": "abc123", // (Required) The ID of the room where the roll occurs
  "diceSkin": {
    // (Optional) Custom visual skin for the dice
    "img": "string",
    "border": "string",
    "bg": "string",
    "text": "string",
    "selectionBg": "string",
    "selectionText": "string"
  }
}
```

**Acknowledgment Response:**

```json
{
  "success": true,
  "results": [
    { "sides": 4, "roll": 4 },
    { "sides": 4, "roll": 2 },
    { "sides": 4, "roll": 3 }
  ],
  "total": 11
}
```

**Broadcasted Event (`roll-result`):**

```json
{
  "results": [
    { "sides": 4, "roll": 4 },
    { "sides": 4, "roll": 2 },
    { "sides": 4, "roll": 3 }
  ],
  "canZero": false,
  "total": 11,
  "skin": {
    "img": "string",
    "border": "string",
    "bg": "string",
    "text": "string",
    "selectionBg": "string",
    "selectionText": "string"
  }
}
```

**Validation Rules:**

- User must be authenticated.
- `dice` must be a non-empty array of numbers.
- `roomId` must be a valid string.
- `canZero` must be a boolean.
- Dice sides must be integers ≥ 2.
- If `sameSides` is `true`, only the first value in the `dice` array is used as the number of sides.
- If `sameSides` is `false`, each dice in the array is rolled individually.

**Skin Fallback:**

If no `diceSkin` is provided, the user's saved skin (from `set-dice`) is used.

**Error Codes:**

| Code | Message                              |
| ---- | ------------------------------------ |
| 1    | Room not found                       |
| 2    | User is not a member of the room     |
| 3    | Invalid sameSides configuration      |
| 4    | Invalid differentSides configuration |

**Rate Limiting:**

This event is subject to per-user dice roll rate limits to prevent abuse or spamming.

---

### `set-dice`

**Description:**

Allows a logged-in user to define a custom visual style (skin) for dice rolls. The skin affects the appearance of dice results shared in chat rooms and can include colors, images, and text styles. All values are trimmed and validated based on system configuration limits.

**Payload:**

```json
{
  "diceSkin": {
    "img": "string", // (Optional) Dice image data
    "border": "string", // (Optional) Border style or color
    "bg": "string", // (Optional) Background style or color
    "text": "string", // (Optional) Text color or style
    "selectionBg": "string", // (Optional) Background color when selected
    "selectionText": "string" // (Optional) Text color when selected
  }
}
```

**Acknowledgment Response:**

```json
{
  "success": true
}
```

**Validation Rules:**

- User must be logged in.
- Payload must include a valid `diceSkin` object.
- Each field in `diceSkin` must be a string if provided.
- All string values are trimmed and truncated based on internal configuration:

| Field           | Max Length (Config Key)     |
| --------------- | --------------------------- |
| `img`           | `DICE_IMG_SIZE`             |
| `border`        | `DICE_BORDER_STYLE`         |
| `bg`            | `DICE_BG_STYLE`             |
| `text`          | `DICE_TEXT_STYLE`           |
| `selectionBg`   | `DICE_SELECTION_BG_STYLE`   |
| `selectionText` | `DICE_SELECTION_TEXT_STYLE` |

**Error Handling:**

- If the `diceSkin` object is missing or not valid, an error acknowledgment is returned.
- If the user is not authenticated, the request is rejected.
- Requests are subject to dice customization rate limits per user.
