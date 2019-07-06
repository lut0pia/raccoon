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

function rcn_ui_checkbox(o) {
  const checkbox_id = 'checkbox_' + Math.random().toString().substr(2);
  let checkbox = document.createElement('input');
  checkbox.id = checkbox_id;
  checkbox.type = 'checkbox';
  checkbox.onchange = o.onchange;
  checkbox.checked = o.checked;
  let checkbox_label = document.createElement('label');
  checkbox_label.htmlFor = checkbox_id;
  checkbox_label.innerText = o.label;
  checkbox_label.prepend(checkbox);
  checkbox_label.checkbox = checkbox;
  return checkbox_label;
}
