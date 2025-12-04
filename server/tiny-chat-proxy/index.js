import path from 'path';
import { isJsonObject } from 'tiny-essentials/basics';
import SocketIoProxyServer from './proxy.mjs';

import { createAppDirectory, ensureIniFile, getIniBoolean } from '../api/ini';

/**
 * @typedef {{ server: { port: number; timeout: number; auth: string; debug: boolean } }} IniCfg
 */

const startServer = async () => {
  // Prepare config file...
  const appDir = createAppDirectory('tiny-chat_proxy', __dirname);
  const { newCfg, defaultCfg } = await ensureIniFile(
    path.join(appDir, `./config.ini`),
    path.join(__dirname, `./config.ini`),
  );

  /** @type {IniCfg} */
  const cfg = { server: { port: NaN, timeout: NaN, auth: '', debug: false } };

  /**
   * Insert Config
   *
   * @param {Partial<IniCfg>} newCfg
   */
  const loadTinyCfg = (newCfg) => {
    if (isJsonObject(newCfg.server)) {
      const port = parseInt(newCfg.server.port);
      if (typeof port === 'number' && !Number.isNaN(port)) cfg.server.port = port;
      const timeout = parseInt(newCfg.server.timeout);
      if (typeof timeout === 'number' && !Number.isNaN(timeout)) cfg.server.timeout = timeout;
      const isDebug = getIniBoolean(newCfg.server.debug);
      if (typeof isDebug === 'boolean') cfg.server.debug = isDebug;
      if (typeof newCfg.server.auth === 'string') cfg.server.auth = newCfg.server.auth;
    }
  };

  loadTinyCfg(defaultCfg);
  loadTinyCfg(newCfg);
  const { port: PROXY_PORT, auth: AUTH, debug: IS_DEBUG, timeout: CONNECTION_TIMEOUT } = cfg.server;

  /////////////////////////////////////////////////////////////////////

  const proxy = new SocketIoProxyServer({
    cors: { origin: '*' },
  });

  proxy.auth = AUTH;
  proxy.connTimeout = CONNECTION_TIMEOUT;

  proxy.on('connection', (userSocket) => console.log('[PROXY] User connected:', userSocket.id));
  proxy.on('disconnect', (userSocket) => console.log('[PROXY] User disconnected:', userSocket.id));
  proxy.on('connection-timeout', (userSocket) => console.log('[PROXY] Timeout:', userSocket.id));

  proxy.on('user-event', (userSocket, eventName, args) => {
    if (IS_DEBUG) console.log('[PROXY] Debug:', eventName, args);
  });

  proxy.on('server-connection', (userSocket) =>
    console.log('[PROXY] Server connected:', userSocket.id),
  );
  proxy.on('server-disconnect', (userSocket) =>
    console.log('[PROXY] Server disconnected:', userSocket.id),
  );

  // Start
  proxy.server.listen(PROXY_PORT);
  console.log(`[PROXY] Using debug? ${IS_DEBUG ? 'Yes' : 'No'}`);
  console.log('[PROXY] Server Online:', PROXY_PORT);
};

// Run
startServer();
