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
Rolls one or multiple dice, either with the same number of sides or different ones.

**Payload:**

```json
{
  "sameSides": "boolean", // If true, all dice have the same number of sides
  "dice": ["number"], // List of dice sides to roll
  "roomId": "string" // The ID of the room
}
```

**Acknowledgment Response:**

```json
{
  "success": true
}
```

**Broadcasted Event:**

```json
{
  "results": [{ "sides": "number", "roll": "number" }],
  "total": "number",
  "skin": [{
    "img": "string",
    "border": "string",
    "bg": "string",
    "text:" "string",
    "selectionBg": "string",
    "selectionText": "string"
  }]
}
```

**Error Handling:**

- If invalid dice values are provided, an error message is emitted to the room.
