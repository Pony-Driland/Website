import { setTinyGoogleAi } from 'tiny-ai-api';
import { TinyHtml } from 'tiny-essentials';

import tinyLib from '../../files/tinyLib.mjs';
import { appData } from '../../important.mjs';
import { tinyAi, tinyIo, tinyStorage } from './base.mjs';

export const tinyAiScript = {
  isEnabled: () => typeof tinyStorage.selectedAi() === 'string',
  enabled: false,
  noai: false,
  mpClient: false,
  aiLogin: {
    base: TinyHtml.createFrom('li', { class: 'nav-item font-weight-bold' }),
    secondsUsed: 0,
    title: '',

    button: tinyLib.bs
      .button({ id: 'ai-login', dsBtn: true, class: 'nav-link' })
      .prepend(tinyLib.icon('fa-solid fa-robot me-2')),

    updateTitle: () => {
      if (tinyAiScript.aiLogin.button) {
        const title = `${tinyAiScript.aiLogin.title}${tinyAiScript.aiLogin.secondsUsed > 0 ? ` - ${formatDayTimer(tinyAiScript.aiLogin.secondsUsed)}` : ''}`;
        tinyAiScript.aiLogin.button.removeAttr('title');
        tinyAiScript.aiLogin.button.setAttr('data-bs-original-title', title);
      }
    },
  },

  killIo: () => {
    if (tinyIo.client) {
      tinyIo.client.destroy();
      tinyIo.client = null;
      console.log('[socket-io] Connection destroyed!');
      return true;
    } else return false;
  },

  // Checker
  checkTitle: () => {
    // Get selected Ai
    const selectedAi = tinyStorage.selectedAi();

    // Exists Google only. Then select google generative
    if (typeof selectedAi === 'string' && selectedAi.length > 0 && selectedAi !== 'NONE') {
      // Update html
      new TinyHtml(tinyAiScript.aiLogin.button.find(':scope > i')).removeClass(
        'text-danger-emphasis',
      );
      tinyAiScript.aiLogin.title = 'AI/RP Enabled';
      TinyHtml.query('body').addClass('can-ai');

      // Update Ai API script
      tinyAiScript.mpClient = false;
      tinyAiScript.noai = false;

      // Google Generative
      if (selectedAi === 'google-generative')
        setTinyGoogleAi(tinyAi, tinyStorage.getApiKey('google-generative')?.key);

      // Tiny Chat --> this is a multiplayer client session
      if (selectedAi === 'tiny-chat') tinyAiScript.mpClient = true;

      // No Ai
      if (selectedAi === 'no-ai') tinyAiScript.noai = true;

      // Enabled now
      tinyAiScript.enabled = true;
    } else {
      // Update html
      new TinyHtml(tinyAiScript.aiLogin.button.find(':scope > i')).addClass('text-danger-emphasis');
      tinyAiScript.aiLogin.title = 'AI/RP Disabled';
      TinyHtml.query('body').removeClass('can-ai');
      tinyAiScript.enabled = false;
    }

    // Update login button
    tinyAiScript.aiLogin.updateTitle();
  },

  // Login button
  login: () => {
    // Selector
    const selector = TinyHtml.createFrom('select', { class: 'form-select text-center' });
    selector.append(TinyHtml.createFrom('option', { value: 'NONE' }).setText('None'));
    const apiPlace = TinyHtml.createFrom('span');
    selector.on('change', () => {
      const value = selector.val();
      const html =
        tinyAiHtml[value] && tinyAiHtml[value].inputs ? tinyAiHtml[value].inputs() : null;
      apiPlace.empty();
      if (html) apiPlace.append(html.desc, html.input, html.submit);
      tinyStorage.setSelectedAi(value);
      tinyAiScript.checkTitle();
    });

    selector.toggleProp('disabled', appData.ai.using);
    const tinyAiHtml = {};

    // Server login inputs
    const insertServerLogin = (tinyInput, values) => {
      const indexs = [];
      tinyInput.push(
        TinyHtml.createFrom('input', {
          type: 'text',
          placeholder: 'Server ip',
          class: 'form-control text-center',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput.push(
        TinyHtml.createFrom('input', {
          type: 'text',
          placeholder: 'Username',
          class: 'form-control text-center mt-3',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput.push(
        TinyHtml.createFrom('input', {
          type: 'password',
          placeholder: 'Password',
          class: 'form-control text-center mt-2',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput.push(
        TinyHtml.createFrom('input', {
          type: 'text',
          placeholder: 'Room Id',
          class: 'form-control text-center mt-3',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput.push(
        TinyHtml.createFrom('input', {
          type: 'password',
          placeholder: 'Room password',
          class: 'form-control text-center mt-2',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput[indexs[0]].setVal(values.ip ?? null).toggleProp('disabled', appData.ai.using);
      tinyInput[indexs[1]].setVal(values.username ?? null).toggleProp('disabled', appData.ai.using);
      tinyInput[indexs[2]].setVal(values.password ?? null).toggleProp('disabled', appData.ai.using);
      tinyInput[indexs[3]].setVal(values.roomId ?? null).toggleProp('disabled', appData.ai.using);
      tinyInput[indexs[4]]
        .setVal(values.roomPassword ?? null)
        .toggleProp('disabled', appData.ai.using);

      return indexs;
    };

    // Save server login
    const insertSaveServerLogin = (inputs, ids) => {
      return {
        ip: inputs[ids[0]].val(),
        username: inputs[ids[1]].val(),
        password: inputs[ids[2]].val(),
        roomId: inputs[ids[3]].val(),
        roomPassword: inputs[ids[4]].val(),
      };
    };

    // Server host about
    const insertServerAbout = () =>
      TinyHtml.createFrom('p').append(
        TinyHtml.createFrom('span').setText('You can host your server '),
        TinyHtml.createFrom('a', {
          href: 'https://github.com/Pony-Driland/Website/tree/main/server/tiny-chat',
          target: '_blank',
        }).setText('here'),
        TinyHtml.createFrom('span').setText('. Enter the server settings you want to connect to.'),
      );

    const hostButton = (inputs, tinyBig = -1) =>
      TinyHtml.createFrom('div').append(
        tinyLib.bs
          .button('secondary mb-3')
          .setText('Show host settings (Alpha)')
          .on('click', () => {
            for (const index in inputs) {
              if (index > tinyBig) {
                inputs[index].toggleClass('d-none');
              }
            }
          }),
      );

    // No AI
    selector.append(TinyHtml.createFrom('option', { value: 'no-ai' }).setText('No AI'));
    tinyAiHtml['no-ai'] = {};
    const noAi = tinyAiHtml['no-ai'];
    noAi.inputs = () => {
      const data = { input: [] };
      data.input.push(hostButton(data.input, 0));
      data.input.push(insertServerAbout());
      const values = tinyStorage.getApiKey('no-ai') || {};
      const ids = insertServerLogin(data.input, values);
      new TinyHtml(data.input[0].find(':scope > button')).trigger('click');

      data.desc = TinyHtml.createFrom('p').setText(
        'No AI will be used in this mode. You will only have access to the simple features.',
      );

      data.submit = tinyLib.bs
        .button('info mx-4 mt-4')
        .setText('Set Settings')
        .on('click', () => {
          const result = insertSaveServerLogin(data.input, ids);
          tinyStorage.setApiKey('no-ai', result);
          tinyAiScript.checkTitle();
          TinyHtml.query('#ai_connection').data('BootstrapModal').hide();
        })
        .toggleProp('disabled', appData.ai.using);

      return data;
    };

    // Separator
    selector.append(
      TinyHtml.createFrom('option').addProp('disabled').setText('--------------------'),
    );
    selector.append(TinyHtml.createFrom('option').addProp('disabled').setText('AI Models'));

    // Google AI
    selector.append(
      TinyHtml.createFrom('option', { value: 'google-generative' }).setText('Google Studio'),
    );
    tinyAiHtml['google-generative'] = {};
    const googleAi = tinyAiHtml['google-generative'];
    googleAi.inputs = () => {
      const data = { input: [] };

      data.input.push(
        TinyHtml.createFrom('input', {
          type: 'password',
          class: 'form-control text-center mb-2',
        }),
      );

      data.input.push(hostButton(data.input, 1));
      data.input.push(insertServerAbout());
      const values = tinyStorage.getApiKey('google-generative') || {};
      data.input[0].setVal(values.key ?? null).toggleProp('disabled', appData.ai.using);
      const ids = insertServerLogin(data.input, values);
      new TinyHtml(data.input[1].find(':scope > button')).trigger('click');

      data.desc = TinyHtml.createFrom('p').append(
        TinyHtml.createFrom('span').setText('You can get your Google API key '),
        TinyHtml.createFrom('a', {
          href: 'https://aistudio.google.com/apikey',
          target: '_blank',
        }).setText('here'),
        TinyHtml.createFrom('span').setText('. Website: aistudio.google.com'),
      );

      data.submit = tinyLib.bs
        .button('info mx-4 mt-4')
        .setText('Set API Tokens')
        .on('click', () => {
          const result = insertSaveServerLogin(data.input, ids);
          result.key = data.input[0].val();
          tinyStorage.setApiKey('google-generative', result);
          tinyAiScript.checkTitle();
          TinyHtml.query('#ai_connection').data('BootstrapModal').hide();
        })
        .toggleProp('disabled', appData.ai.using);

      return data;
    };

    // Separator
    selector.append(
      TinyHtml.createFrom('option').addProp('disabled').setText('--------------------'),
    );
    selector.append(TinyHtml.createFrom('option').addProp('disabled').setText('Clients'));

    // Tiny chat
    selector.append(TinyHtml.createFrom('option', { value: 'tiny-chat' }).setText('Multiplayer'));
    tinyAiHtml['tiny-chat'] = {};
    const tinyChat = tinyAiHtml['tiny-chat'];
    tinyChat.inputs = () => {
      const data = { input: [] };
      const values = tinyStorage.getApiKey('tiny-chat') || {};
      const ids = insertServerLogin(data.input, values);
      data.desc = insertServerAbout();

      data.submit = tinyLib.bs
        .button('info mx-4 mt-4')
        .setText('Set connection settings')
        .on('click', () => {
          tinyStorage.setApiKey('tiny-chat', insertSaveServerLogin(data.input, ids));
          tinyAiScript.checkTitle();
          TinyHtml.query('#ai_connection').data('BootstrapModal').hide();
        })
        .toggleProp('disabled', appData.ai.using);

      return data;
    };

    // Modal
    selector.setVal(tinyStorage.selectedAi() || 'NONE');
    selector.trigger('change');

    tinyLib.modal({
      id: 'ai_connection',
      title: 'AI/RP Protocol',
      dialog: 'modal-lg',
      body: TinyHtml.createFrom('center').append(
        TinyHtml.createFrom('p').setText(
          `You are in an optional setting. You do not need AI to use the website!`,
        ),
        TinyHtml.createFrom('p').setText(
          `This website does not belong to any AI company, and all API input is stored locally inside your machine. This website is just a client to run prompts in artificial intelligence, there is no native artificial intelligence installed here.`,
        ),
        TinyHtml.createFrom('p').setText(
          `By activating an artificial intelligence service in your session, you agree to the terms of use and privacy policies of the third party services you are using on this website. You will always be warned when any artificial intelligence service needs to be run on this website.`,
        ),
        selector,
        apiPlace,
      ),
    });
  },
};
