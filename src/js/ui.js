// UI helper functions

function rcn_ui_button(o) {
  var button = document.createElement('input');
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
