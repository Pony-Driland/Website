import EventEmitter from 'events';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';
import { tinyLs } from '../important.mjs';

/**
 * @typedef {{
 *   date: { year?: number, month: number, day: number },
 *   metadata: { primary: boolean, source: { id: string, type: string } }
 * }} UserBirthday
 * User birthday object.
 */

/**
 * Callback function triggered when the Firebase authentication state changes.
 *
 * Use this type when subscribing to auth state changes, e.g., with `onAuthStateChanged`.
 *
 * @callback OnAuthStateChanged
 * @param {import('firebase/auth').User|null} user - The currently authenticated user, or `null` if signed out.
 */

/**
 * Firebase account manager with Google login and People API integration.
 */
class FirebaseAccount extends EventEmitter {
  /** @type {import("firebase/auth").User|null} */
  #currentUser = null;

  /** @type {import("firebase/app").FirebaseApp} */
  #app;

  /** @type {import("firebase/auth").Auth} */
  #auth;

  /** @type {GoogleAuthProvider} */
  #provider;

  /** @type {string|null} */
  #accessToken = null;

  /** @type {boolean} */
  #initialized = false;

  /**
   * Indicates whether the FirebaseAccount instance has been initialized via `init()`.
   * Useful to check before calling auth methods.
   * @type {boolean}
   */
  get initialized() {
    return this.#initialized;
  }

  /**
   * Get the current authenticated user (if any).
   * @returns {import("firebase/auth").User|null}
   */
  get currentUser() {
    return this.#currentUser;
  }

  /**
   * The initialized Firebase application instance.
   * @type {import("firebase/app").FirebaseApp}
   */
  get app() {
    return this.#app;
  }

  /**
   * The Firebase Authentication instance for this app.
   * @type {import("firebase/auth").Auth}
   */
  get auth() {
    return this.#auth;
  }

  /**
   * The Google provider instance used for login with OAuth scopes.
   * @type {GoogleAuthProvider}
   */
  get provider() {
    return this.#provider;
  }

  /**
   * Gets the user's birthday information from the Google People API.
   * @type {UserBirthday[]}
   */
  get birthday() {
    return this._birthdayValidator(tinyLs.getJson('userBirthday') ?? []);
  }

  /**
   * Create a new Firebase account manager.
   * @param {import("firebase/app").FirebaseOptions} firebaseConfig - Firebase configuration object.
   * @param {string} [name] - Optional Firebase app name for multi-app setups.
   */
  constructor(firebaseConfig, name) {
    super();
    this.#app = initializeApp(firebaseConfig, name);
    this.#auth = getAuth(this.#app);
    this.#provider = new GoogleAuthProvider();
    this.#provider.addScope('https://www.googleapis.com/auth/user.birthday.read');
  }

  /**
   * Ensures that the FirebaseAccount instance has been initialized via `init()`.
   * Throws an error if any auth-related methods are called before initialization.
   * @private
   * @throws {Error} If the instance is not yet initialized.
   */
  _ensureInitialized() {
    if (!this.#initialized)
      throw new Error('FirebaseAccount not initialized. Call init() before using auth methods.');
  }

  /**
   * Initializes the FirebaseAccount instance.
   * Sets up Firebase Auth state listener and marks the instance as initialized.
   * Must be called before using any auth-related methods like `login` and `logout`.
   * Multiple calls to `init()` are safe and will have no effect after the first call.
   * @returns {Promise<void>}
   */
  async init() {
    if (this.#initialized) return;
    this.#initialized = true;

    // Listen for session changes
    onAuthStateChanged(this.#auth, (user) => {
      this.#currentUser = user;
      this.emit('authStateChanged', user);
    });
  }

  /**
   * Login with Google provider and update current session.
   * @returns {Promise<import("firebase/auth").User>} The logged-in user.
   */
  async login() {
    this._ensureInitialized();
    const result = await signInWithPopup(this.#auth, this.#provider);
    this._getAccessToken(result);
    this.#currentUser = result.user;
    await this.getBirthday();

    this.emit('login', this.#currentUser);
    return this.#currentUser;
  }

  /**
   * Logout the current user and clear session.
   * @returns {Promise<void>}
   */
  async logout() {
    this._ensureInitialized();
    await signOut(this.#auth);
    tinyLs.removeItem('userBirthday');
    this.#currentUser = null;
    this.emit('logout');
  }

  /**
   * Get the Google OAuth access token for API requests.
   * @private
   * @param {import("firebase/auth").UserCredential} result - Firebase login result.
   * @returns {string|null} OAuth access token.
   */
  _getAccessToken(result) {
    this._ensureInitialized();
    const credential = GoogleAuthProvider.credentialFromResult(result);
    this.#accessToken = credential?.accessToken ?? null;
    return credential?.accessToken ?? null;
  }

  /**
   * Validate and normalize Google People API `birthdays` data.
   *
   * Ensures each entry has:
   * - `date` with `month` (1-12), `day` (1-31), optional `year` > 0
   * - `metadata` object with valid `source` and optional `primary` boolean
   *
   * Invalid entries are discarded, and only the validated fields are returned.
   *
   * @private
   * @param {any} birthdays - Raw `birthdays` array from Google People API.
   * @returns {UserBirthday[]} An array of validated and normalized UserBirthday objects.
   */
  _birthdayValidator(birthdays) {
    if (!Array.isArray(birthdays)) return [];

    /** @type {UserBirthday[]} */
    return birthdays
      .filter((entry) => {
        if (!entry || typeof entry !== 'object') return false;

        const { date, metadata } = entry;

        // Validate date
        if (!date || typeof date !== 'object') return false;
        const { year, month, day } = date;
        if (typeof month !== 'number' || month < 1 || month > 12) return false;
        if (typeof day !== 'number' || day < 1 || day > 31) return false;
        if (year !== undefined && (typeof year !== 'number' || year < 1)) return false;

        // Validate metadata
        if (!metadata || typeof metadata !== 'object') return false;
        const { source, primary } = metadata;

        if (!source || typeof source !== 'object') return false;
        if (!source.type || typeof source.type !== 'string') return false;
        if (source.id !== undefined && typeof source.id !== 'string') return false;

        if (primary !== undefined && typeof primary !== 'boolean') return false;

        return true;
      })
      .map((entry) => {
        const { date, metadata } = entry;
        const normalized = {
          date: {
            year: date.year,
            month: date.month,
            day: date.day,
          },
          metadata: {
            source: {
              type: metadata.source.type,
              id: metadata.source.id,
            },
            primary: metadata.primary,
          },
        };
        return normalized;
      });
  }

  /**
   * Fetch the user's birthday information from the Google People API.
   *
   * This requires that the user has granted the `https://www.googleapis.com/auth/user.birthday.read`
   * scope during Google login. The method will refresh the OAuth token by prompting a popup login
   * if necessary.
   *
   * The returned object typically contains an array of `birthdays`, where each entry can have a
   * `date` object with `year`, `month`, and `day`.
   * ```
   *
   * @returns {Promise<UserBirthday[]>}
   * Birthday data object from Google People API.
   * @throws {Error} If the user is not logged in or the request fails.
   */
  async getBirthday() {
    this._ensureInitialized();
    if (!this.#currentUser) throw new Error('No user logged in.');

    const response = await fetch(
      'https://people.googleapis.com/v1/people/me?personFields=birthdays',
      {
        headers: { Authorization: `Bearer ${this.#accessToken}` },
      },
    );

    if (!response.ok) throw new Error('Failed to fetch birthday data from Google People API.');
    const data = await response.json();

    // Validate structure
    if (!data || !Array.isArray(data.birthdays)) return [];

    /** @type {UserBirthday[]} */
    const validBirthdays = this._birthdayValidator(data.birthdays);

    if (validBirthdays.length === 0) return [];
    tinyLs.setJson('userBirthday', validBirthdays);
    this.emit('birthdayFetched', validBirthdays);
    return validBirthdays;
  }
}

export default FirebaseAccount;
