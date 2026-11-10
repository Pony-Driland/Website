declare module '@json-editor/json-editor' {
  /** A single JSON Schema node. */
  export interface JsonSchema {
    /** Property definitions of an `object` schema. */
    properties?: Record<string, JsonSchema>;
    /** Item definition of an `array` schema. */
    items?: JsonSchema | JsonSchema[];
    /** Allowed types of the value. */
    type?: string | string[];
    /** Human readable title. */
    title?: string;
    /** Human readable description. */
    description?: string;
    /** Default value of the field. */
    default?: unknown;
    /** Enumeration of the accepted values. */
    enum?: unknown[];
    /** Any other JSON Schema keyword. */
    [key: string]: unknown;
  }

  /** Validation error returned by `JSONEditor#validate()`. */
  export interface JSONEditorError {
    /** JSON pointer of the invalid property. */
    path: string;
    /** Human readable error message. */
    message: string;
    /** Schema property that failed. */
    property: string;
  }

  export interface JSONEditorOptions<T = Record<string, unknown>> {
    /** The JSON Schema (Draft 4, 6, or 7) that defines the data format. */
    schema: JsonSchema;
    /** Initial value to populate the editor. */
    startval?: T;
    /** Name of the UI theme to use (e.g., 'bootstrap5', 'html', 'spectre'). */
    theme?: string;
    /** Name of the icon library to use (e.g., 'fontawesome5'). */
    iconlib?: string;
    /** If true, removes the "Edit JSON" buttons. */
    disable_edit_json?: boolean;
    /** If true, removes the "Properties" buttons. */
    disable_properties?: boolean;
    /** If true, removes the collapse/expand buttons. */
    disable_collapse?: boolean;
    /** If true, the editor will attempt to resolve remote $ref references via AJAX. */
    ajax?: boolean;
    /** Allows providing local references for schemas. */
    refs?: Record<string, JsonSchema>;
    /** If true, all schema properties will be treated as required. */
    required_by_default?: boolean;
    /** If true, keeps the data when switching between oneOf or anyOf options. */
    keep_oneof_values?: boolean;
    /** If true, additional properties are rejected by the schema. */
    no_additional_properties?: boolean;
    /** Controls when validation errors are shown. */
    show_errors?: 'interaction' | 'change' | 'always' | 'never';
    /** Sets the template engine (e.g., 'default', 'ejs', 'handlebars'). */
    template?:
      string | { compile: (template: string) => (vars: Record<string, unknown>) => string };
    /** Other options allowed by the library. */
    [key: string]: unknown;
  }

  export class JSONEditor<T = Record<string, unknown>> {
    /**
     * Instantiates a new JSON Editor.
     * @param element The HTML element where the editor will be rendered.
     * @param options The configuration options and schema.
     */
    constructor(element: HTMLElement, options: JSONEditorOptions<T>);

    /** Default global options and configurations for the library. */
    static defaults: {
      options: JSONEditorOptions;
      themes: Record<string, unknown>;
      iconlibs: Record<string, unknown>;
      editors: Record<string, unknown>;
      resolvers: Array<(schema: JsonSchema) => string>;
      custom_validators: Array<
        (schema: JsonSchema, value: unknown, path: string) => JSONEditorError[]
      >;
      [key: string]: unknown;
    };

    /** Returns the current value of the editor as a JavaScript object. */
    getValue(): T;

    /** Sets the value of the editor. */
    setValue(value: T): void;

    /**
     * Validates the current data against the schema.
     * @param value Optional. If not provided, validates the current editor value.
     * @returns An array of validation errors (empty if valid).
     */
    validate(value?: T): JSONEditorError[];

    /** Listens for editor events (e.g., 'change', 'ready'). */
    on(event: string, callback: () => void): void;

    /** Removes the event listener from the editor. */
    off(event: string, callback: () => void): void;

    /** Destroys the editor instance, removing events and clearing the HTML. */
    destroy(): void;

    /** Disables the editor, preventing any user interaction. */
    disable(): void;

    /** Enables the editor after it has been disabled. */
    enable(): void;

    /** Returns `true` while the editor accepts user interaction. */
    isEnabled(): boolean;

    /** Returns the editor class for a specific path. */
    getEditor(path: string): JSONEditor<T> | null;

    /** The main root editor. */
    root: JSONEditor<T> | null;

    /** The HTML element where the editor was mounted. */
    element: HTMLElement;
  }

  export default JSONEditor;
}
