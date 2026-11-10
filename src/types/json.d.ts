// Ambient JSON types shared across the application.

/** Any value that can be serialized to JSON. */
type JsonPrimitive = string | number | boolean | null;

/** Any JSON value. */
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
