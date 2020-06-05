// Raccoon game mode functionality
'use strict';

function rcn_start_game_mode(params) {
  console.log('Starting game mode');

  document.body.classList.add('game');
  document.body.classList.toggle('touch', rcn_is_touch_device);
  document.body.classList.toggle('export', !!params.export);

  const viewport_meta = document.createElement('meta');
  viewport_meta.setAttribute('name', 'viewport');
  viewport_meta.setAttribute('content', 'user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width, height=device-height, target-densitydpi=device-dpi');
  document.head.appendChild(viewport_meta);

  const vm = new rcn_vm({
    no_network: !!params.export,
  });
  vm.load_bin(params.bin);
  document.title = params.bin.display_name;
  document.body.appendChild(vm.canvas.node);
  vm.canvas.node.focus();

  if(rcn_is_touch_device) {
    rcn_create_touch_controls(vm);
    vm.set_gamepad_layout(0, rcn.gamepad_layout_abxy);
    document.body.addEventListener('click', function() {
      rcn_fullscreen(this);
    });
  }

  if(!rcn_is_touch_device) {
    const edit_link = document.createElement('a');
    edit_link.id = 'edit_link';
    edit_link.href = location.href + '&edit';
    edit_link.innerText = 'Open in edit mode';
    edit_link.target = '_blank';
    document.body.appendChild(edit_link);
  }
}

function rcn_create_touch_controls(vm) {
  const controls_div = document.createElement('div');
  controls_div.classList.add('controls');

  const control_axes = document.createElement('div');
  control_axes.classList.add('axes');
  const axes_touch_event = function(e) {
    e.preventDefault();
    const div_coords = this.getBoundingClientRect();
    const axes_bits = [false, false, false, false];
    if(e.type != 'touchend') {
      for(let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const div_x = ((touch.clientX - div_coords.x) / div_coords.width) - 0.5;
        const div_y = ((touch.clientY - div_coords.y) / div_coords.height) - 0.5;

        axes_bits[0] |= (div_x < -0.16);
        axes_bits[1] |= (div_x > 0.16);
        axes_bits[2] |= (div_y < -0.16);
        axes_bits[3] |= (div_y > 0.16);
      }
    }

    for(let i = 0; i < 4; i++) {
      vm.set_gamepad_bit(0, i, axes_bits[i]);
    }
  }
  control_axes.addEventListener('touchstart', axes_touch_event);
  control_axes.addEventListener('touchmove', axes_touch_event);
  control_axes.addEventListener('touchend', axes_touch_event);
  control_axes.addEventListener('contextmenu', function(e) {
    e.preventDefault()
  });
  controls_div.appendChild(control_axes);

  const control_axes_img = document.createElement('img');
  control_axes_img.src = rcn_resource('src/img/control_axes.svg');
  control_axes.appendChild(control_axes_img);

  const controls_buttons = document.createElement('div');
  controls_buttons.classList.add('buttons');
  const buttons_touch_event = function(e) {
    e.preventDefault();
    const div_coords = this.getBoundingClientRect();
    const buttons_bits = [false, false, false, false];
    if(e.type != 'touchend') {
      for(let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const div_x = ((touch.clientX - div_coords.x) / div_coords.width) - 0.5;
        const div_y = ((touch.clientY - div_coords.y) / div_coords.height) - 0.5;
        const in_center_column = div_y > -0.16 && div_y < 0.16;
        const in_center_line = div_x > -0.16 && div_x < 0.16;

        buttons_bits[2] |= div_x < -0.16 && in_center_column;
        buttons_bits[1] |= div_x > 0.16 && in_center_column;
        buttons_bits[3] |= div_y < -0.16 && in_center_line;
        buttons_bits[0] |= div_y > 0.16 && in_center_line;
      }
    }

    for(let i = 0; i < 4; i++) {
      vm.set_gamepad_bit(0, i+4, !!buttons_bits[i]);
    }
  }
  controls_buttons.addEventListener('touchstart', buttons_touch_event);
  controls_buttons.addEventListener('touchmove', buttons_touch_event);
  controls_buttons.addEventListener('touchend', buttons_touch_event);
  controls_buttons.addEventListener('contextmenu', function(e) {
    e.preventDefault()
  });
  controls_div.appendChild(controls_buttons);

  const control_buttons_img = document.createElement('img');
  control_buttons_img.src = rcn_resource('src/img/control_buttons.svg');
  controls_buttons.appendChild(control_buttons_img);

  document.body.appendChild(controls_div);
}
