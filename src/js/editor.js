// Raccoon editor functionality
'use strict';

async function rcn_start_editor_mode(params) {
  console.log('Starting editor mode');

  document.body.classList.add('editor');

  // Sort editors alphabetically
  rcn_editors.sort(function(a, b) {
    return a.prototype.title > b.prototype.title ? 1 : -1;
  });

  const create_editor_button = (ed) => {
    const editor_el = document.createElement('article');
    editor_el.innerText = ed.prototype.title;
    ed.prototype.button = editor_el;
    editor_el.addEventListener('click', function() {
      rcn_find_editor(ed, true);
      rcn_update_toolbox();
    });
    editor_el.appendChild(rcn_ui_button({
      value: '✖️',
      classes: ['close'],
      onclick: function(e) {
        e.stopPropagation();
        const editor = rcn_find_editor(ed);
        if(editor) {
          editor.kill();
        }
      },
    }));
    return editor_el;
  };

  const create_editor_group = (group) => {
    const group_el = document.createElement('section');
    group_el.className = group;
    for(let ed of rcn_editors) {
      if(ed.prototype.group == group) {
        group_el.appendChild(create_editor_button(ed));
      }
    }
    return group_el;
  };

  // Editor groups
  const editor_groups = rcn_editors
    .map(e => e.prototype.group)
    .filter((v, i, a) => v && a.indexOf(v) == i)
    .sort();

  // Fill toolbox
  for(let group of editor_groups) {
    rcn_toolbox.appendChild(create_editor_group(group));
  }
  rcn_toolbox.appendChild(create_editor_group());

  // Fill layout box
  rcn_update_layoutbox();

  rcn_global_bin = new rcn_bin();
  if(rcn_storage.working_bin) {
    // Load bin from last session
    rcn_global_bin.from_json(rcn_storage.working_bin);
  }

  if(params.bin && await rcn_confirm_bin_override()) {
    rcn_global_bin = params.bin;
  }

  window.addEventListener('beforeunload', function() {
    // Save bin for next session
    rcn_storage.working_bin = rcn_global_bin.to_json();
  });

  rcn_window_load_layout(rcn_storage.window_layout || {
    // Default window layout
    'default_docs_ed': {
      ctor: 'rcn_docs_ed',
      top: '0px', left: '0px',
      width: window.innerWidth+'px', height: window.innerHeight+'px',
    },
  });

  // Flush all canvases
  // Need to wait a bit because we just created the DOM elements
  // and layout may not have kicked in yet
  setTimeout(function() {
    const canvases = document.getElementsByTagName('canvas');
    for(let i = 0; i < canvases.length; i++) {
      const canvas = canvases[i];
      if(canvas.rcn_canvas) {
        canvas.rcn_canvas.flush();
      }
    }
  }, 100);

  // Event history (undo/redo)
  let code_event_stack = [{
    value: rcn_global_bin.code,
    first_time: 0,
    last_time: 0,
    selection_start: 0,
    selection_end: 0,
  }];
  let code_event_index = 0;
  let data_event_stack = [];
  let data_event_index = 0;
  let data_event_mirror = rcn_global_bin.rom.slice();
  document.body.addEventListener('keydown', function(e) {
    if(e.target.type == 'text') return;

    const is_code = e.target.type == 'textarea';
    let code_event;
    let offset;
    let patch;

    if(is_code && code_event_index == 0) {
      // Save selection bounds for first state, otherwise we have 0:0 and it sucks
      code_event_stack[0].selection_start = e.target.selectionStart;
      code_event_stack[0].selection_end = e.target.selectionEnd;
    }

    if(!(e.ctrlKey || e.metaKey)) return;

    if(is_code && e.key == 'z' && code_event_index > 0) { // Undo code
      code_event = code_event_stack[--code_event_index];
    } else if(is_code && e.key == 'y' && code_event_index < code_event_stack.length - 1) { // Redo code
      code_event = code_event_stack[++code_event_index];
    } else if(!is_code && e.key == 'z' && data_event_index > 0) { // Undo data
      offset = data_event_stack[--data_event_index].offset;
      patch = data_event_stack[data_event_index].before;
    } else if(!is_code && e.key == 'y' && data_event_index < data_event_stack.length) { // Redo data
      offset = data_event_stack[data_event_index].offset;
      patch = data_event_stack[data_event_index++].after;
    } else {
      return;
    }

    if(is_code) {
      rcn_global_bin.code = code_event.value;
      rcn_dispatch_ed_event('rcn_bin_change', {
        code: true,
        undo_redo: true,
      });
      e.target.selectionStart = code_event.selection_start;
      e.target.selectionEnd = code_event.selection_end;
    } else {
      rcn_global_bin.rom.set(patch, offset);
      data_event_mirror.set(patch, offset);

      rcn_dispatch_ed_event('rcn_bin_change', {
        begin: offset,
        end: offset + patch.length,
        undo_redo: true,
      });
    }

    e.preventDefault();
  });
  document.body.addEventListener('rcn_bin_change', function(e) {
    if(e.detail.undo_redo) return; // This event was trigger by an undo/redo
    if(e.detail.load) { // Complete bin load, clear undo stack
      code_event_stack = [{
        value: rcn_global_bin.code,
        first_time: 0,
        last_time: 0,
        selection_start: 0,
        selection_end: 0,
      }];
      code_event_index = 0;
      data_event_stack = [];
      data_event_index = 0;
      data_event_mirror = rcn_global_bin.rom.slice();
      return;
    }

    const mem_begin = e.detail.begin;
    const mem_end = e.detail.end;
    const now = Date.now();

    if(e.detail.code) { // This event changes code
      const prev_event = code_event_stack[code_event_index];
      if(prev_event.value == rcn_global_bin.code) {
        return; // Nothing changed
      }

      const code_ed = rcn_find_editor(rcn_code_ed);
      let event = {
        value: rcn_global_bin.code,
        first_time: now,
        last_time: now,
        selection_start: code_ed ? code_ed.textarea.selectionStart : 0,
        selection_end: code_ed ? code_ed.textarea.selectionEnd : 0,
      };

      code_event_stack.splice(code_event_index + 1);

      if(prev_event.last_time > now - 500 && prev_event.first_time > now - 5000) {
        // Extend previous event
        event.first_time = prev_event.first_time;
        code_event_stack[code_event_index] = event;
      } else {
        // Create new event
        code_event_stack.push(event);
        code_event_index++;
      }
    } else if(mem_begin != mem_end) { // This event changes rom
      let event = {
        offset: mem_begin,
        after: rcn_global_bin.rom.slice(mem_begin, mem_end),
        before: data_event_mirror.slice(mem_begin, mem_end),
        first_time: now,
        last_time: now,
      };

      if(event.after.join() === event.before.join()) {
        return; // Nothing changed
      }

      data_event_stack.splice(data_event_index);
      const prev_event = data_event_index > 0 && data_event_stack[data_event_index - 1];

      if(prev_event && prev_event.last_time > now - 500 && prev_event.first_time > now - 5000) {
        // Extend previous event
        let new_begin = Math.min(prev_event.offset, mem_begin);
        let new_end = Math.max(prev_event.offset + prev_event.before.length, mem_end)
        event.offset = new_begin;
        event.first_time = prev_event.first_time;
        event.after = rcn_global_bin.rom.slice(new_begin, new_end);
        event.before = data_event_mirror.slice(new_begin, new_end);
        event.before.set(prev_event.before, prev_event.offset - new_begin);
        data_event_stack[data_event_index - 1] = event;
      } else {
        // Create new event
        data_event_stack.push(event);
        data_event_index++;
      }

      data_event_mirror.set(event.after, event.offset);
    }
  });

  // Header bin details
  const bin_details = document.createElement('div');
  bin_details.id = 'header_bin_details';
  rcn_header.appendChild(bin_details);

  const bin_name = document.createElement('span');
  bin_name.id = 'header_bin_name';
  bin_details.appendChild(bin_name);

  const bin_host = document.createElement('span');
  bin_host.id = 'header_bin_host';
  bin_details.appendChild(bin_host);

  const bin_details_button = rcn_ui_button({
    value: '🏷️',
    onclick: e => {
      const popup_node = document.createElement('p');

      // Create display name input
      const display_name_input = document.createElement('input');
      display_name_input.classList.add('display_name');
      display_name_input.type = 'text';
      display_name_input.placeholder = 'Display name';
      display_name_input.oninput = function() {
        rcn_global_bin.display_name = this.value;
        rcn_dispatch_ed_event('rcn_bin_change');
      }
      popup_node.appendChild(display_name_input);

      // Create host select
      const host_select = document.createElement('select');
      host_select.onchange = function() {
        rcn_global_bin.host = this.value == 'undefined' ? undefined : this.value;
        rcn_dispatch_ed_event('rcn_bin_change');
      }
      const none_option = document.createElement('option');
      none_option.innerText = 'None';
      none_option.value = 'undefined';
      host_select.appendChild(none_option);
      for(let host_id in rcn_hosts) {
        const option = document.createElement('option');
        option.innerText = rcn_hosts[host_id].display_name;
        option.value = host_id;
        host_select.appendChild(option);
      }
      popup_node.appendChild(host_select);

      // Create link input
      const link_input = document.createElement('input');
      link_input.type = 'text';
      link_input.placeholder = 'Link';
      link_input.onchange = function() {
        rcn_global_bin.link = this.value == '' ? undefined : this.value;
        rcn_dispatch_ed_event('rcn_bin_change');
      }
      popup_node.appendChild(link_input);

      display_name_input.value = rcn_global_bin.display_name;
      host_select.value = rcn_global_bin.host || 'undefined';
      link_input.value = rcn_global_bin.link || '';

      rcn_ui_popup({
        node: popup_node,
      });
    },
  })
  bin_details.appendChild(bin_details_button);

  const update_bin_details = e => {
    bin_name.innerText = rcn_global_bin.name;
    if(rcn_global_bin.host && rcn_global_bin.link) {
      bin_host.innerText = `(${rcn_global_bin.host}/${rcn_global_bin.link})`;
    } else {
      bin_host.innerText = '';
    }
    document.body.setAttribute('bin_save_status', rcn_bin_save_status());
  };
  document.body.addEventListener('rcn_bin_change', update_bin_details);
  document.body.addEventListener('rcn_bins_change', update_bin_details);

  // Header menu
  const change_bin = async function(new_bin) {
    if(rcn_global_bin != new_bin && !await rcn_confirm_bin_override()) {
      return;
    }
    rcn_global_bin = new_bin;
    rcn_dispatch_ed_event('rcn_bin_change', {
      begin: 0,
      end: rcn.rom_size,
      code: true,
      load: true,
    });
  };
  const save_bin = function() {
    rcn_storage.bins[rcn_global_bin.name] = rcn_global_bin.to_json();
    rcn_dispatch_ed_event('rcn_bins_change');
  };
  const delete_bin = function(bin_name) {
    delete rcn_storage.bins[bin_name];
    rcn_dispatch_ed_event('rcn_bins_change');
  }
  const get_bin_host = async function(bin) {
    let host = null;
    for(let host_id in rcn_hosts) {
      if(bin.host == host_id) {
        host = rcn_hosts[host_id];
      }
    }

    if(!host) {
      await rcn_ui_alert('No valid host for bin '+bin.name);
    } else if(!bin.link) {
      await rcn_ui_alert('No valid link for bin '+bin.name);
      host = null;
    }

    return host;
  };
  const merge = async function(local, latest, ref) {
    const inner_merge = async function(name, access, hash) {
      const local_value = access(local);
      const latest_value = access(latest);
      const ref_value = access(ref);
      const local_hash = hash(local_value);
      const latest_hash = hash(latest_value);
      const ref_hash = hash(ref_value)
      if(ref_hash == local_hash || local_hash == latest_hash) {
        return latest_value;
      } else if(ref_hash == latest_hash) {
        return local_value;
      } else {
        while(true) {
          const choice = await rcn_ui_popup({
            text:`There is a conflict between local changes to ${name} and latest changes.`+
              `\nWhich version do you wish to keep?`,
            buttons: [
              {
                value: `Keep local ${name}`,
                return_value: 'local',
              },
              {
                value: `Take latest ${name}`,
                return_value: 'latest',
              },
              {
                value: 'Cancel',
                return_value: 'cancel',
              },
            ]
          });
          switch(choice) {
            case 'local': return local_value;
            case 'latest': return latest_value;
            default: throw 'Cancelled merge';
          }
        }
      }
    }
    const merged = {};
    for(let part_id in ref) {
      switch(part_id) {
        case 'code':
          merged[part_id] = await inner_merge(part_id, b => b.code, p => p && p.join(''));
          break;
        case 'rom':
          const rom_part_names = {
            mus: 'music',
            pal: 'palette',
            snd: 'sound',
            spf: 'sprite flags',
            spr: 'sprites',
          }
          merged.rom = {};
          for(let rom_part_id in ref.rom) {
            merged.rom[rom_part_id] = await inner_merge(rom_part_names[rom_part_id] || rom_part_id,
              b => b.rom[rom_part_id], p => p && p.join(''));
          }
          break;
        default:
          merged[part_id] = await inner_merge(part_id, b => b[part_id], p => p);
          break;
      }
    }
    return merged;
  };
  rcn_editor_header_button({
    path: 'File/New',
    action: () => change_bin(new rcn_bin()),
  });
  rcn_editor_header_button({
    path: 'File/Open...',
    shortcut: 'Ctrl+O',
    action: async () => {
      const nodes = [];
      for(let stored_bin of Object.values(rcn_storage.bins)) {
        const bin_node = document.createElement('article');

        const bin_name = document.createElement('span');
        bin_name.innerText = stored_bin.name;
        bin_node.appendChild(bin_name);

        bin_node.appendChild(rcn_ui_button({
          value: 'Load',
          onclick: async () => {
            const bin = new rcn_bin();
            bin.from_json(stored_bin);
            await change_bin(bin);
            rcn_popup_resolve();
          },
        }));
        bin_node.appendChild(rcn_ui_button({
          value: 'Delete',
          onclick: async () => {
            if(await rcn_ui_confirm(`Are you sure you want to delete ${stored_bin.name}?`)) {
              delete_bin(stored_bin.name);
              rcn_popup_resolve();
            }
          },
        }));

        if(stored_bin.host && stored_bin.link) {
          // This is a hosted bin
          const bin_host = document.createElement('span');
          bin_host.classList.add('host');
          bin_host.innerText += '('+stored_bin.host+'/'+stored_bin.link+')';
          bin_node.appendChild(bin_host);
        }

        nodes.push(bin_node);
      }
      return await rcn_ui_popup({
        nodes: nodes,
      });
    },
  });
  rcn_editor_header_button({
    path: 'File/Save',
    shortcut: 'Ctrl+S',
    action: () => save_bin(),
  });
  rcn_editor_header_button({
    path: 'File/Save As...',
    shortcut: 'Ctrl+Shift+S',
    action: async () => {
      const bin_name = await rcn_ui_prompt('Bin name:', rcn_global_bin.name);
      if(bin_name) {
        rcn_global_bin.name = bin_name;
        save_bin();
      }
    },
  });
  rcn_editor_header_button({
    path: 'File/Export/JSON',
    action: () => rcn_download_file({
      file_name: rcn_global_bin.name + '.rcn.json',
      content: rcn_global_bin.to_json_text(),
    }),
  });
  rcn_editor_header_button({
    path: 'File/Export/HTML',
    action: async () => rcn_download_file({
      file_name: rcn_global_bin.name + '.rcn.html',
      content: await async function() {
        let scripts = await Promise.all([
          rcn_http_request('src/js/init.js'), // This needs to stay at the beginning
          rcn_http_request('src/js/audio.js'),
          rcn_http_request('src/js/bin.js'),
          rcn_http_request('src/js/canvas.js'),
          rcn_http_request('src/js/game.js'),
          rcn_http_request('src/js/gl.js'),
          rcn_http_request('src/js/utility.js'),
          rcn_http_request('src/js/vm.js'),
          rcn_http_request('src/js/vm_worker.js'),
        ]);
        let styles = await Promise.all([
          rcn_http_request('src/css/reset.css'),
          rcn_http_request('src/css/game.css'),
          rcn_http_request('src/css/export.css'),
        ]);

        let resources = await Promise.all([
          'src/img/control_axes.svg',
          'src/img/control_buttons.svg',
        ].map(async function(url) {
          const mime = {
            svg: 'image/svg+xml',
          }[url.split('.').pop()];
          return 'rcn_resources[' + JSON.stringify(url) + '] = '
          + 'URL.createObjectURL(new Blob('
          + '[' + JSON.stringify(await rcn_http_request(url)) + '],'
          + '{type: ' + JSON.stringify(mime) + '}));';
        }));

        let script = document.createElement('script');
        script.type = 'text/javascript';
        script.innerHTML =
          'const rcn_static_bin_json = ' + JSON.stringify(rcn_global_bin.to_json()) + '\n'
          + scripts.join('\n') + '\n'
          + resources.join('\n');

        let style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = styles.join('\n');

        let html = document.createElement('html');
        let head = document.createElement('head');
        let charset_meta = document.createElement('meta');
        charset_meta.setAttribute('charset', 'UTF-8');

        head.appendChild(charset_meta);
        head.appendChild(script);
        head.appendChild(style);
        html.appendChild(head);
        return html.outerHTML;
      }(),
    }),
  });
  for(let host_id in rcn_hosts) {
    const host = rcn_hosts[host_id]
    if(!host.import) {
      continue;
    }
    rcn_editor_header_button({
      path: `File/Import/${host.display_name}...`,
      action: async () => {
        const bins = await host.import();

        const nodes = [];
        for(let bin_desc of bins) {
          const bin_node = document.createElement('article');

          const bin_name = document.createElement('span');
          bin_name.innerText = bin_desc.name;
          bin_node.appendChild(bin_name);

          bin_node.appendChild(rcn_ui_button({
            value: 'Import',
            onclick: async () => {
              rcn_popup_resolve();
              try {
                const data = await rcn_overlay_wrap(() => host.read({
                  link: bin_desc.link,
                  latest: true,
                }));
                const bin = new rcn_bin();
                bin.from_json(JSON.parse(data.text));
                bin.name = bin_desc.name;
                bin.host = data.host;
                bin.link = data.link;
                await change_bin(bin);
              } catch(e) {
                await rcn_ui_alert(`Failed to import bin ${bin_desc.name}: ${e}`);
              }
            },
          }));

          const bin_host = document.createElement('span');
          bin_host.classList.add('host');
          bin_host.innerText += `(${host_id}/${bin_desc.link})`;
          bin_node.appendChild(bin_host);

          nodes.push(bin_node);
        }
        return await rcn_ui_popup({
          nodes: nodes,
        });
      },
    });
  }
  rcn_editor_header_button({
    path: 'Source Control/Push',
    action: async function() {
      const host = await get_bin_host(rcn_global_bin);
      if(!host) return;

      try {
        const data = await rcn_overlay_wrap(() => host.sync({
          link: rcn_global_bin.link,
          text: rcn_global_bin.to_json_text(),
        }));
        const bin = new rcn_bin();
        bin.from_json(JSON.parse(data.text));
        bin.name = rcn_global_bin.name;
        bin.host = data.host;
        bin.link = data.link;
        await change_bin(bin);
      } catch(e) {
        if(e == 'conflict') {
          await rcn_ui_alert(`Failed to merge bin ${rcn_global_bin.name} because of a conflict. Try pulling to resolve problems.`);
        } else {
          await rcn_ui_alert(`Failed to push bin ${rcn_global_bin.name}: ${e}`);
        }
      }
    },
  });
  rcn_editor_header_button({
    path: 'Source Control/Pull',
    action: async function() {
      const host = await get_bin_host(rcn_global_bin);
      if(!host) return;

      try {
        const local_json = rcn_global_bin.to_json();
        const ref_data = await rcn_overlay_wrap(() => host.read({
          link: rcn_global_bin.link,
        }));
        const latest_data = await rcn_overlay_wrap(() => host.read({
          link: rcn_global_bin.link,
          latest: true,
        }));
        ref_data.json = JSON.parse(ref_data.text);
        latest_data.json = JSON.parse(latest_data.text);

        const merged = await merge(local_json, latest_data.json, ref_data.json);
        const bin = new rcn_bin();
        bin.from_json(merged);
        bin.name = rcn_global_bin.name;
        bin.host = latest_data.host;
        bin.link = latest_data.link;
        await change_bin(bin);
      } catch(e) {
        await rcn_ui_alert(`Failed to pull bin ${rcn_global_bin.name}: ${e}`);
      }
    },
  });
  rcn_editor_header_button({
    path: 'Source Control/Force Push',
    action: async function() {
      const host = await get_bin_host(rcn_global_bin);
      if(!host) return;

      if(!await rcn_ui_confirm(
        `Are you sure you want to force push bin ${rcn_global_bin.name} to ${rcn_global_bin.link}?`+
        `\nThis is a destructive action.`)) {
        return;
      }
      try {
        const data = await rcn_overlay_wrap(() => host.write({
          link: rcn_global_bin.link,
          text: rcn_global_bin.to_json_text(),
          name: 'bin.rcn.json'
        }));
        const bin = new rcn_bin();
        bin.from_json(JSON.parse(data.text));
        bin.name = rcn_global_bin.name;
        bin.host = rcn_global_bin.host;
        bin.link = data.link;
        await change_bin(bin);
      } catch(e) {
        await rcn_ui_alert(`Failed to force push bin ${rcn_global_bin.name}: ${e}`);
      }
    },
  });
  rcn_editor_header_button({
    path: 'Source Control/Force Pull',
    action: async function() {
      const host = await get_bin_host(rcn_global_bin);
      if(!host) return;

      try {
        const data = await rcn_overlay_wrap(() => host.read({
          link: rcn_global_bin.link,
          latest: true,
        }));
        const bin = new rcn_bin();
        bin.from_json(JSON.parse(data.text));
        bin.name = rcn_global_bin.name;
        bin.host = rcn_global_bin.host;
        bin.link = data.link;
        await change_bin(bin);
      } catch(e) {
        await rcn_ui_alert(`Failed to force pull bin ${rcn_global_bin.name}: ${e}`);
      }
    },
  });
  rcn_editor_header_button({
    path: 'Virtual Machine/Reboot',
    shortcut: 'Ctrl+Alt+Enter',
    action: function() {
      const vm_ed = rcn_find_editor(rcn_vm_ed);
      vm_ed && vm_ed.reboot();
    },
  });

  // Trigger bin change event
  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: 0,
    end: rcn.rom_size,
    code: true,
  });
}

const rcn_side_panel = document.createElement('aside');
document.body.appendChild(rcn_side_panel);

const rcn_toolbox = document.createElement('div');
rcn_toolbox.id = 'toolbox';
rcn_side_panel.appendChild(rcn_toolbox);

const rcn_layoutbox = document.createElement('div');
rcn_layoutbox.id = 'layoutbox';
rcn_side_panel.appendChild(rcn_layoutbox);

const rcn_window_container = document.createElement('main');
document.body.appendChild(rcn_window_container);

function rcn_update_toolbox() {
  for(let ed of rcn_editors) {
    ed.prototype.button.classList.toggle('active', !!rcn_find_editor(ed));
  }
}

function rcn_update_layoutbox() {
  // Clear
  while(rcn_layoutbox.firstChild) {
    rcn_layoutbox.removeChild(rcn_layoutbox.firstChild);
  }

  for(const layout_name in rcn_storage.window_layouts) {
    const layout_article = document.createElement('article');
    layout_article.innerText = layout_name;
    rcn_layoutbox.appendChild(layout_article);

    layout_article.appendChild(rcn_ui_button({
      value: 'Load',
      classes: ['load'],
      onclick: function() {
        rcn_window_load_layout(rcn_storage.window_layouts[layout_name]);
      },
    }));

    layout_article.appendChild(rcn_ui_button({
      value: '✖️',
      classes: ['delete'],
      onclick: function() {
        delete rcn_storage.window_layouts[layout_name];
        rcn_update_layoutbox();
      },
    }));
  }
  rcn_layoutbox.appendChild(rcn_ui_button({
    value: 'Save current layout',
    classes: ['save'],
    onclick: async () => {
      const layout_name = await rcn_ui_prompt('Layout name:');
      if(layout_name) {
        rcn_storage.window_layouts[layout_name] = rcn_window_save_layout();
        rcn_update_layoutbox();
      }
    },
  }));
}

function rcn_dispatch_ed_event(type, detail) {
  const event = new CustomEvent(type, {detail: detail || {}});

  for(let i = 0; i < rcn_window_container.childElementCount; i++) {
    rcn_window_container.children[i].dispatchEvent(event);
  }

  // Useful for global mechanisms, such as undo stack
  document.body.dispatchEvent(event);
}

function rcn_bin_save_status() {
  const saved_bin = rcn_storage.bins[rcn_global_bin.name];
  const current_json = JSON.stringify(rcn_global_bin.to_json());
  const default_json = JSON.stringify((new rcn_bin()).to_json());
  const saved_json = saved_bin ? JSON.stringify(saved_bin) : '';
  if(current_json == default_json) {
    return 'default';
  } else if(!saved_json) {
    return 'new';
  } else if(current_json != saved_json) {
    return 'unsaved';
  } else {
    return 'saved';
  }
}

async function rcn_confirm_bin_override() {
  const save_status = rcn_bin_save_status();
  return (save_status != 'unsaved' && save_status != 'new') ||
    await rcn_ui_confirm(`Are you sure you want to overwrite your working bin ${rcn_global_bin.name}? You have unsaved changes.`);
}

// Create defaults in rcn_storage
if(!rcn_storage.bins) {
  rcn_storage.bins = {};
}

// Move from old bin array to new bin map
if(rcn_storage.bins instanceof Array) {
  if(rcn_storage.bins.length > 0) {
    rcn_storage.bins = Object.assign(...Object.values(rcn_storage.bins).map(bin => ({[bin.name]: bin})));
  } else {
    rcn_storage.bins = {};
  }
}

if(!rcn_storage.window_layouts) {
  rcn_storage.window_layouts = {};
}

function rcn_find_editor(ed, create = false) {
  for(let i = 0; i < rcn_window_container.childElementCount; i++) {
    const section = rcn_window_container.children[i];
    const window = section.rcn_window;
    if(window.constructor == ed) {
      if(create) {
        window.foreground();
      }
      return window;
    }
  }
  if(create) {
    return new ed();
  }
  return null;
}
