// Raccoon editor header functions
'use strict';

const rcn_header = document.createElement('header');
document.body.appendChild(rcn_header);

const rcn_header_logo = document.createElement('img');
rcn_header_logo.src = 'src/img/logo.svg';
rcn_header.appendChild(rcn_header_logo);

const rcn_header_menu = document.createElement('menu');
rcn_header.appendChild(rcn_header_menu);

const rcn_header_buttons = [];

function rcn_editor_header_button(o) {
  const path_parts = o.path.split('/');
  let parent_children = rcn_header_buttons;
  let parent_container_el = rcn_header_menu;
  while(path_parts.length > 0) {
    const part = path_parts.shift();
    let button = parent_children.find(btn => btn.name == part);

    if(!button) {
      button = {
        name: part,
        params: o,
      };
      const button_el = document.createElement('button');
      const span_el = document.createElement('span')
      span_el.innerText = part;
      button_el.appendChild(span_el);

      if(path_parts.length > 0) { // Folder
        const folder_el = document.createElement('div');
        folder_el.classList.add('folder');
        folder_el.appendChild(button_el);
        button.el = folder_el;
        button.container_el = document.createElement('div');
        button.container_el.classList.add('container');
        folder_el.appendChild(button.container_el);
        button.children = [];
      } else { // Leaf button
        button.el = button_el;
        if(o.action) {
          button.el.addEventListener('click', o.action);
        }
        if(o.shortcut) {
          const kbd_el = document.createElement('kbd')
          kbd_el.innerText = o.shortcut;
          button_el.appendChild(kbd_el);
        }
      }
      parent_container_el.appendChild(button.el);
      parent_children.push(button);
    }

    parent_children = button.children;
    parent_container_el = button.container_el;
  }
}

function rcn_conditional_keyboard_shortcut(button, e) {
  const shortcut = button.params.shortcut;
  const action = button.params.action;
  if(shortcut && action) {
    const shortcut_keys = shortcut.split('+').sort();
    const pressed_keys = [
      e.key[0].toUpperCase() + e.key.slice(1),
      e.altKey && 'Alt',
      e.ctrlKey && 'Ctrl',
      e.shiftKey && 'Shift',
    ].filter(k => k).sort();

    if(shortcut_keys.join() == pressed_keys.join()) {
      action(e);
      e.preventDefault();
      return true;
    }
  }

  for(let child of button.children || []) {
    if(rcn_conditional_keyboard_shortcut(child, e)) {
      return true;
    }
  }

  return false;
}
document.body.addEventListener('keydown', e => {
  for(let button of rcn_header_buttons) {
    if(rcn_conditional_keyboard_shortcut(button, e)) {
      return;
    }
  }
});
