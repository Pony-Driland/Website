import $ from 'jquery';
import { setTinyGoogleAi } from 'tiny-ai-api';

import tinyLib from '../../files/tinyLib.mjs';
import { appData } from '../../important.mjs';
import { tinyAi, tinyIo, tinyStorage } from './base.mjs';

export const tinyAiScript = {
  isEnabled: () => typeof tinyStorage.selectedAi() === 'string',
  enabled: false,
  noai: false,
  mpClient: false,
  aiLogin: null,

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
      tinyAiScript.aiLogin.button.find('> i').removeClass('text-danger-emphasis');
      tinyAiScript.aiLogin.title = 'AI/RP Enabled';
      $('body').addClass('can-ai');

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
      tinyAiScript.aiLogin.button.find('> i').addClass('text-danger-emphasis');
      tinyAiScript.aiLogin.title = 'AI/RP Disabled';
      $('body').removeClass('can-ai');
      tinyAiScript.enabled = false;
    }

    // Update login button
    tinyAiScript.aiLogin.updateTitle();
  },

  // Login button
  login: () => {
    // Selector
    const selector = $('<select>', { class: 'form-select text-center' });
    selector.append($('<option>', { value: 'NONE' }).text('None'));
    const apiPlace = $('<span>');
    selector.on('change', function () {
      const value = selector.val();
      const html =
        tinyAiHtml[value] && tinyAiHtml[value].inputs ? tinyAiHtml[value].inputs() : null;
      apiPlace.empty();
      if (html) apiPlace.append(html.desc, html.input, html.submit);
      tinyStorage.setSelectedAi(value);
      tinyAiScript.checkTitle();
    });

    selector.prop('disabled', appData.ai.using);
    const tinyAiHtml = {};

    // Server login inputs
    const insertServerLogin = (tinyInput, values) => {
      const indexs = [];
      tinyInput.push(
        $('<input>', {
          type: 'text',
          placeholder: 'Server ip',
          class: 'form-control text-center',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput.push(
        $('<input>', {
          type: 'text',
          placeholder: 'Username',
          class: 'form-control text-center mt-3',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput.push(
        $('<input>', {
          type: 'password',
          placeholder: 'Password',
          class: 'form-control text-center mt-2',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput.push(
        $('<input>', {
          type: 'text',
          placeholder: 'Room Id',
          class: 'form-control text-center mt-3',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput.push(
        $('<input>', {
          type: 'password',
          placeholder: 'Room password',
          class: 'form-control text-center mt-2',
        }),
      );
      indexs.push(tinyInput.length - 1);

      tinyInput[indexs[0]].val(values.ip).prop('disabled', appData.ai.using);
      tinyInput[indexs[1]].val(values.username).prop('disabled', appData.ai.using);
      tinyInput[indexs[2]].val(values.password).prop('disabled', appData.ai.using);
      tinyInput[indexs[3]].val(values.roomId).prop('disabled', appData.ai.using);
      tinyInput[indexs[4]].val(values.roomPassword).prop('disabled', appData.ai.using);

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
      $('<p>').append(
        $('<span>').text('You can host your server '),
        $('<a>', {
          href: 'https://github.com/Pony-Driland/Website/tree/main/server/tiny-chat',
          target: '_blank',
        }).text('here'),
        $('<span>').text('. Enter the server settings you want to connect to.'),
      );

    const hostButton = (inputs, tinyBig = -1) =>
      $('<div>').append(
        tinyLib.bs
          .button('secondary mb-3')
          .text('Show host settings (Alpha)')
          .on('click', () => {
            for (const index in inputs) {
              if (index > tinyBig) {
                inputs[index].toggleClass('d-none');
              }
            }
          }),
      );

    // No AI
    selector.append($('<option>', { value: 'no-ai' }).text('No AI'));
    tinyAiHtml['no-ai'] = {};
    const noAi = tinyAiHtml['no-ai'];
    noAi.inputs = () => {
      const data = { input: [] };
      data.input.push(hostButton(data.input, 0));
      data.input.push(insertServerAbout());
      const values = tinyStorage.getApiKey('no-ai') || {};
      const ids = insertServerLogin(data.input, values);
      data.input[0].find('> button').trigger('click');

      data.desc = $('<p>').text(
        'No AI will be used in this mode. You will only have access to the simple features.',
      );

      data.submit = tinyLib.bs
        .button('info mx-4 mt-4')
        .text('Set Settings')
        .on('click', () => {
          const result = insertSaveServerLogin(data.input, ids);
          tinyStorage.setApiKey('no-ai', result);
          tinyAiScript.checkTitle();
          $('#ai_connection').modal('hide');
        })
        .prop('disabled', appData.ai.using);

      return data;
    };

    // Separator
    selector.append($('<option>').prop('disabled', true).text('--------------------'));
    selector.append($('<option>').prop('disabled', true).text('AI Models'));

    // Google AI
    selector.append($('<option>', { value: 'google-generative' }).text('Google Studio'));
    tinyAiHtml['google-generative'] = {};
    const googleAi = tinyAiHtml['google-generative'];
    googleAi.inputs = () => {
      const data = { input: [] };

      data.input.push(
        $('<input>', {
          type: 'password',
          class: 'form-control text-center mb-2',
        }),
      );

      data.input.push(hostButton(data.input, 1));
      data.input.push(insertServerAbout());
      const values = tinyStorage.getApiKey('google-generative') || {};
      data.input[0].val(values.key).prop('disabled', appData.ai.using);
      const ids = insertServerLogin(data.input, values);
      data.input[1].find('> button').trigger('click');

      data.desc = $('<p>').append(
        $('<span>').text('You can get your Google API key '),
        $('<a>', {
          href: 'https://aistudio.google.com/apikey',
          target: '_blank',
        }).text('here'),
        $('<span>').text('. Website: aistudio.google.com'),
      );

      data.submit = tinyLib.bs
        .button('info mx-4 mt-4')
        .text('Set API Tokens')
        .on('click', () => {
          const result = insertSaveServerLogin(data.input, ids);
          result.key = data.input[0].val();
          tinyStorage.setApiKey('google-generative', result);
          tinyAiScript.checkTitle();
          $('#ai_connection').modal('hide');
        })
        .prop('disabled', appData.ai.using);

      return data;
    };

    // Separator
    selector.append($('<option>').prop('disabled', true).text('--------------------'));
    selector.append($('<option>').prop('disabled', true).text('Clients'));

    // Tiny chat
    selector.append($('<option>', { value: 'tiny-chat' }).text('Multiplayer'));
    tinyAiHtml['tiny-chat'] = {};
    const tinyChat = tinyAiHtml['tiny-chat'];
    tinyChat.inputs = () => {
      const data = { input: [] };
      const values = tinyStorage.getApiKey('tiny-chat') || {};
      const ids = insertServerLogin(data.input, values);
      data.desc = insertServerAbout();

      data.submit = tinyLib.bs
        .button('info mx-4 mt-4')
        .text('Set connection settings')
        .on('click', () => {
          tinyStorage.setApiKey('tiny-chat', insertSaveServerLogin(data.input, ids));
          tinyAiScript.checkTitle();
          $('#ai_connection').modal('hide');
        })
        .prop('disabled', appData.ai.using);

      return data;
    };

    // Modal
    selector.val(tinyStorage.selectedAi() || 'NONE');
    selector.trigger('change');

    tinyLib.modal({
      id: 'ai_connection',
      title: 'AI/RP Protocol',
      dialog: 'modal-lg',
      body: $('<center>').append(
        $('<p>').text(`You are in an optional setting. You do not need AI to use the website!`),
        $('<p>').text(
          `This website does not belong to any AI company, and all API input is stored locally inside your machine. This website is just a client to run prompts in artificial intelligence, there is no native artificial intelligence installed here.`,
        ),
        $('<p>').text(
          `By activating an artificial intelligence service in your session, you agree to the terms of use and privacy policies of the third party services you are using on this website. You will always be warned when any artificial intelligence service needs to be run on this website.`,
        ),
        selector,
        apiPlace,
      ),
    });
  },
};
