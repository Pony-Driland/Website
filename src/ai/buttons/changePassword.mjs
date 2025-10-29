import TinyHtml from 'tiny-essentials/libs/TinyHtml';
import { tinyIo } from '../software/base.mjs';
import tinyLib from '../../files/tinyLib.mjs';

export const openChangePassword = () => {
  // Root
  const ratelimit = tinyIo.client.getRateLimit() || { size: {} };
  const $root = TinyHtml.createFrom('div');

  // Error place
  const $errorBox = tinyLib.bs.alert('danger', '', false).addClass('d-none');

  // Create label and input
  const createInputGroup = (labelText, inputId, type = 'password') => {
    const $group = TinyHtml.createFrom('div').addClass('mb-3');
    const $label = TinyHtml.createFrom('label')
      .addClass('form-label')
      .setAttr('for', inputId)
      .setText(labelText);
    const $input = TinyHtml.createFrom('input').addClass('form-control').setAttr({
      type,
      id: inputId,
      placeholder: labelText,
      maxLength: ratelimit.size.password,
    });
    $group.append($label, $input);
    return { group: $group, input: $input };
  };

  const current = createInputGroup('Current Password', 'current-password');
  const newPass = createInputGroup('New Password', 'new-password');
  const confirmPass = createInputGroup('Confirm New Password', 'confirm-password');

  // Change password button
  const $button = tinyLib.bs.button('primary').addClass('w-100').setText('Change Password');

  // Build all
  $root.append($errorBox, current.group, newPass.group, confirmPass.group, $button);

  // show error
  const showError = (msg) => {
    $errorBox.setHtml(msg).removeClass('d-none');
  };

  // Hide the error when the user starts to type
  [current.input, newPass.input, confirmPass.input].forEach(($input) => {
    $input.on('input', () => $errorBox.addClass('d-none'));
  });

  // Enter button
  [current.input, newPass.input, confirmPass.input].forEach(($input) => {
    $input.on('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $button.trigger('click');
      }
    });
  });

  // Button click
  $button.on('click', () => {
    const currentVal = current.input.val().trim();
    const newVal = newPass.input.val().trim();
    const confirmVal = confirmPass.input.val().trim();

    if (!currentVal || !newVal || !confirmVal) {
      showError('Please fill in all fields.');
      return;
    }

    if (newVal !== confirmVal) {
      showError('New passwords do not match.');
      return;
    }

    if (newVal.length < ratelimit.size.minPassword) {
      showError(`New password must be at least ${ratelimit.size.minPassword} characters.`);
      return;
    }

    // Tiny okay!
    $errorBox.addClass('d-none');
    modal.hide();
    tinyIo.client.changePassword(currentVal, newVal).then((result) => {
      if (result.error) alert(`${result.msg}\nCode ${result.code}`);
      else alert('Your password has been changed successfully!');
    });
  });

  // Create modal
  const { modal, html } = tinyLib.modal({
    title: 'Change Password',
    dialog: 'modal-lg',
    id: 'modal-password-change',
    body: $root,
  });

  html.on('shown.bs.modal', () => {
    current.input.trigger('focus');
  });
};
