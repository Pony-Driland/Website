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

Allows a logged-in user to roll one or more dice, either using the same number of sides or different ones. The results are broadcast to all users in the specified room. Dice can also be visually customized using user-owned skins.

**Payload:**

```json
{
  "sameSides": true, // If true, all dice will have the same number of sides
  "dice": [2, 2, 2], // Array of dice sides. If sameSides is true, all values should be the same
  "diceSkin": "object", // (Optional) Skin to apply to the dice
  "roomId": "string" // ID of the room where the dice will be rolled
}
```

**Acknowledgment Response:**

```json
{
  "success": true
}
```

**Broadcasted Event:** `roll-result`

```json
{
  "results": [
    { "sides": 2, "roll": 3 },
    { "sides": 2, "roll": 5 },
    { "sides": 2, "roll": 2 }
  ],
  "total": 10,
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

**Error Responses (Acknowledgment):**

```json
{ "error": true, "code": 1, "msg": "Room not found." }
{ "error": true, "code": 2, "msg": "You are not in this room." }
{ "error": true, "code": 3, "msg": "Invalid dice of same sides configuration" }
{ "error": true, "code": 4, "msg": "Invalid dice of diff sides configuration" }
```

**Validation Rules:**

- User must be logged in.
- The `dice` array must contain at least one item.
- All dice values must be numbers greater than or equal to 2.
- If `sameSides` is `true`, all dice must use the same number of sides.
- The user must be present in the room (`roomId`).
- If no valid `diceSkin` is provided, the server will fallback to the user's default dice skin if available.

**Note:**

- Dice rolling is subject to rate limiting per user to prevent abuse.

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
