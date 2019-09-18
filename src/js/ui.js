// UI helper functions
'use strict';

function rcn_ui_button(o) {
  const button = document.createElement('input');
  button.type = 'button';
  button.value = o.value || 'Button';
  if(o.onclick) {
    button.onclick = o.onclick;
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

const rcn_ui_checkbox_text_regex = /[a-z0-9]+/i;
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
  checkbox.classList.toggle('text', o.label !== undefined && rcn_ui_checkbox_text_regex.test(o.label));
  checkbox.checkbox = checkbox_input;
  checkbox.appendChild(checkbox_input);
  checkbox.appendChild(checkbox_label);
  return checkbox;
}
