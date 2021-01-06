// UI helper functions
'use strict';

const rcn_ui_text_regex = /[a-z0-9]+/i;

function rcn_ui_button(o) {
  const button = document.createElement('input');
  button.type = 'button';
  button.value = o.value || 'Button';
  button.classList.toggle('text', o.value !== undefined && rcn_ui_text_regex.test(o.value));
  for(let class_name of o.classes || []) {
    button.classList.add(class_name);
  }
  if(o.onclick) {
    button.addEventListener('click', o.onclick);
  }
  return button;
}

function rcn_ui_number(o) {
  const number_id = 'number_' + Math.random().toString().substr(2);
  const number_input = document.createElement('input');
  number_input.id = number_id;
  number_input.type = 'number';
  number_input.value = o.value;
  number_input.max = o.max;
  number_input.min = o.min;
  number_input.step = o.step;
  if(o.onchange) {
    number_input.onchange = o.onchange;
  }

  const number_label = document.createElement('label');
  number_label.htmlFor = number_id;
  number_label.innerText = o.label;

  const number = document.createElement('number');
  number.classList.toggle('text', o.label !== undefined && rcn_ui_text_regex.test(o.label));
  number.number = number_input;
  number.appendChild(number_label);
  number.appendChild(number_input);
  return number;
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

const rcn_popup_stack = [];
function rcn_popup_resolve() {
  rcn_popup_stack[0].resolve(...arguments);
}
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
    o.resolve = resolve;

    if(rcn_popup_stack.length > 0) {
      const previous_popup = rcn_popup_stack[0];
      previous_popup.el.remove();
    }

    rcn_popup_stack.unshift(o);

    rcn_overlay_push();

    o.el = document.createElement('div');
    o.el.id = 'popup';
    document.body.appendChild(o.el);

    const popup_content = document.createElement('div');
    popup_content.id = 'popup_content';
    o.el.appendChild(popup_content);

    if(o.text) {
      const text_el = document.createElement('p');
      text_el.innerText = o.text;
      popup_content.appendChild(text_el);
    }

    for(let node of o.nodes || (o.node && [o.node]) || []) {
      popup_content.appendChild(node);
    }

    const buttons_el = document.createElement('div');
    buttons_el.classList.add('buttons');
    o.el.appendChild(buttons_el);

    for(let button of o.buttons) {
      const button_el = rcn_ui_button(button);
      if(!button.onclick) {
        button_el.addEventListener('click', () => resolve(button.return_value));
      }
      buttons_el.appendChild(button_el);
    }
  });
  const close_popup = function() {
    o.el.remove();
    rcn_popup_stack.shift();
    if(rcn_popup_stack.length > 0) {
      document.body.appendChild(rcn_popup_stack[0].el);
    }
    rcn_overlay_pop();
  }
  promise.then(close_popup, close_popup);
  return promise;
}

async function rcn_ui_confirm(text) {
  return rcn_ui_popup({
    text: text,
    buttons: [
      {
        value: 'Okay',
        return_value: true,
      },
      {
        value: 'Cancel',
        return_value: false,
      },
    ],
  });
}

async function rcn_ui_alert(text) {
  return rcn_ui_popup({
    text: text,
  });
}

async function rcn_ui_prompt(text, default_text) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = default_text || '';
  input.addEventListener('keydown', e => {
    if(e.key == 'Enter') {
      rcn_popup_resolve(input.value);
    }
  });
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
  const wrapper = document.createElement('p');
  const text_el = document.createElement('p');
  text_el.innerText = text;
  wrapper.append(text_el, input);
  return rcn_ui_popup({
    node: wrapper,
    buttons: [
      {
        value: 'Okay',
        onclick: () => rcn_popup_resolve(input.value),
      },
      {
        value: 'Cancel',
        return_value: null,
      },
    ],
  });
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

async function rcn_overlay_wrap(f) {
  rcn_overlay_push();
  try {
    return await Promise.resolve(f());
  } catch(e) {
    throw e;
  } finally {
    rcn_overlay_pop();
  }
}
