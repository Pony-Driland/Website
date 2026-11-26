import { JSONEditor } from '@json-editor/json-editor';

JSONEditor.defaults.options.theme = 'bootstrap5';
JSONEditor.defaults.options.iconlib = 'fontawesome5';

/**
 * The bootstrap5 theme paints every nested panel with `bg-light` (a white
 * background applied with `!important`), which is unreadable on the dark
 * offcanvas. Clearing the modifier here keeps `src/scss/json-editor.scss` free
 * of `!important` overrides for the panel surfaces.
 */
JSONEditor.defaults.options.object_background = '';
JSONEditor.defaults.options.object_text = '';

export default JSONEditor;
