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
