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
        if(o.onclick) {
          button.el.addEventListener('click', o.onclick);
        }
      }
      parent_container_el.appendChild(button.el);
      parent_children.push(button);
    }

    parent_children = button.children;
    parent_container_el = button.container_el;
  }
}
