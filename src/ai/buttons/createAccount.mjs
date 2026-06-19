import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import tinyLib, { alert } from '../../files/tinyLib.mjs';
import { tinyIo } from '../software/base.mjs';

export const openCreateAccount = () => {
  // Get data
  const ratelimit = tinyIo.client.getRateLimit() || { size: {} };
  const userData = tinyIo.client.getUser() || {};
  if (ratelimit.openRegistration || userData.isAdmin) {
    // Root container
    const $root = TinyHtml.createFrom('div');

    // Error alert box (initially hidden)
    const $errorBox = tinyLib.bs.alert('danger', '', false).addClass('d-none');

    // Helper to build input fields
    const createInputGroup = (labelText, inputId, maxLength = null, type = 'text') => {
      const $group = TinyHtml.createFrom('div').addClass('mb-3');
      const $label = TinyHtml.createFrom('label')
        .addClass('form-label')
        .setAttr('for', inputId)
        .setText(labelText);
      const $input = TinyHtml.createFrom('input')
        .addClass('form-control')
        .setAttr({ maxLength, type, id: inputId, placeholder: labelText });
      $group.append($label, $input);
      return { group: $group, input: $input };
    };

    // Input fields
    const user = createInputGroup('User ID (no spaces)', 'register-user-id', ratelimit.size.userId);
    const pass = createInputGroup(
      'Password',
      'register-password',
      ratelimit.size.password,
      'password',
    );
    const confirm = createInputGroup(
      'Confirm Password',
      'register-confirm-password',
      ratelimit.size.password,
      'password',
    );
    const nick = createInputGroup(
      'Nickname (optional)',
      'register-nickname',
      ratelimit.size.nickname,
    );

    // Submit button
    const $button = tinyLib.bs.button('success').addClass('w-100').setText('Create Account');

    // Build the form
    $root.append($errorBox, user.group, pass.group, confirm.group, nick.group, $button);

    // Show error message
    const showError = (msg) => {
      $errorBox.setHtml(msg).removeClass('d-none');
    };

    // Clear error when typing
    [user.input, pass.input, confirm.input, nick.input].forEach(($input) => {
      $input.on('input', () => $errorBox.addClass('d-none'));
    });

    // Handle Enter key
    [user.input, pass.input, confirm.input, nick.input].forEach(($input) => {
      $input.on('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          $button.trigger('click');
        }
      });
    });

    // Submit action
    $button.on('click', () => {
      const userId = user.input.val().trim();
      const password = pass.input.val().trim();
      const confirmPassword = confirm.input.val().trim();
      const nickname = nick.input.val().trim();

      if (!userId || !password || !confirmPassword) {
        showError('User ID and both password fields are required.');
        return;
      }

      if (/\s/.test(userId)) {
        showError('User ID must not contain spaces.');
        return;
      }

      if (password.length < ratelimit.size.minPassword) {
        showError(`Password must be at least ${ratelimit.size.minPassword} characters long.`);
        return;
      }

      if (password !== confirmPassword) {
        showError('Passwords do not match.');
        return;
      }

      // Tiny okay!
      $errorBox.addClass('d-none');
      modal.hide();
      tinyIo.client.register(userId, password, nickname).then((result) => {
        if (result.error) alert(`${result.msg}\nCode ${result.code}`);
        else alert(`The new account was successfully created!`);
      });
    });

    // Launch modal with focus on first input
    const { modal, html } = tinyLib.modal({
      title: 'Create Account',
      dialog: 'modal-lg',
      id: 'modal-create-account',
      body: $root,
    });

    html.on('shown.bs.modal', () => {
      user.input.trigger('focus');
    });
  }

  // No Perm
  else
    tinyLib.modal({
      title: 'Create Account',
      dialog: 'modal-lg',
      id: 'modal-create-account',
      body: TinyHtml.createFrom('center').setText('You are not allowed to do this.'),
    });
};
