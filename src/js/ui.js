// UI helper functions
'use strict';

const rcn_ui_text_regex = /[a-z0-9]+/i;

function rcn_ui_button(o) {
  const button = document.createElement('input');
  button.type = 'button';
  button.value = o.value || 'Button';
  button.classList.toggle('text', o.value !== undefined && rcn_ui_text_regex.test(o.value));
  if(o.onclick) {
    button.addEventListener('click', o.onclick);
  }
  return button;
}

function rcn_ui_select(o) {
  let select = document.createElement('select');
  for(let i in o.options) {
    if(o.options.hasOwnProperty(i)) {
      let option = document.createElement('option');
      option.innerText = o.options[i];
      option.value = i;
      select.appendChild(option);
    }
  }
  if(o.onchange) {
    select.onchange = o.onchange;
  }
  return select;
}

function rcn_ui_checkbox(o) {
  const checkbox_id = 'checkbox_' + Math.random().toString().substr(2);
  const checkbox_input = document.createElement('input');
  checkbox_input.id = checkbox_id;
  checkbox_input.type = 'checkbox';
  checkbox_input.onchange = o.onchange;
  checkbox_input.checked = o.checked;

  const checkbox_label = document.createElement('label');
  checkbox_label.htmlFor = checkbox_id;
  checkbox_label.innerText = o.label;

  const checkbox = document.createElement('checkbox');
  checkbox.classList.toggle('text', o.label !== undefined && rcn_ui_text_regex.test(o.label));
  checkbox.checkbox = checkbox_input;
  checkbox.appendChild(checkbox_input);
  checkbox.appendChild(checkbox_label);
  return checkbox;
}

const rcn_popup = document.createElement('div');
rcn_popup.id = 'popup';
document.body.appendChild(rcn_popup);

async function rcn_ui_popup(o) {
   // Ensure there is at least a button to close the popup
   if(!o.buttons || o.buttons.length == 0) {
    o.buttons = [
      {
        value: 'Close',
      },
    ];
  }

  const promise = new Promise(function(resolve) {
    rcn_overlay_push();

    if(o.text) {
      const text_el = document.createElement('p');
      text_el.innerText = o.text;
      rcn_popup.appendChild(text_el);
    }

    const buttons_el = document.createElement('div');
    buttons_el.classList.add('buttons');
    rcn_popup.appendChild(buttons_el);

    for(let button of o.buttons) {
      const button_el = rcn_ui_button(button);
      const return_value = button.return_value;
      button_el.addEventListener('click', () => resolve(return_value));
      buttons_el.appendChild(button_el);
    }
    rcn_popup.classList.add('active');
  });
  const close_popup = function() {
    rcn_popup.classList.remove('active');
    while(rcn_popup.firstChild) {
      rcn_popup.removeChild(rcn_popup.firstChild);
    }
    rcn_overlay_pop();
  }
  promise.then(close_popup, close_popup);
  return promise;
}

const rcn_overlay = document.createElement('div');
rcn_overlay.id = 'overlay';
rcn_overlay.stack = 0;
document.body.appendChild(rcn_overlay);

function rcn_overlay_push() {
  if(++rcn_overlay.stack > 0) {
    rcn_overlay.classList.add('active');
  }
}

function rcn_overlay_pop() {
  if(--rcn_overlay.stack <= 0) {
    rcn_overlay.classList.remove('active');
  }
}
