/**
 * Markers wrapped around the fic payload that is sent to the model.
 *
 * The model is instructed to treat everything between a start and an end marker
 * as file content, which keeps the prompt injection surface small.
 *
 * @module ai/values/defaults
 */

export const fileStart = `---------- START: Official Pony Driland fic file ----------`;
export const fileEnd = `---------- END: Official Pony Driland fic file ----------`;

export const userFileStart = '---------- START: The User RPG Official Data ----------';
export const userFileEnd = '---------- END: The User RPG Official Data ----------';

export const officialFileStart = '---------- START: RPG Official Data ----------';
export const officialFileEnd = '---------- END: RPG Official Data ----------';
