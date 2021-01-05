// Raccoon content fill helper
'use strict';

function rcn_editor_fill(o) {
  const visited = new Set();
  const queue = [];
  queue.push({x: o.start_x, y: o.start_y});
  const value_cmp = o.get_value(o.start_x, o.start_y);
  let change_begin = Infinity;
  let change_end = -Infinity;

  while(queue.length > 0) {
    const node = queue.pop();
    const x = node.x;
    const y = node.y;
    const key = x + (y << 8);
    if(visited.has(key)) continue; // Already visited this value
    visited.add(key);
    if(!o.is_in_selection(x, y)) continue; // Outside selection
    const value = o.get_value(x,  y);
    if(value != value_cmp) continue; // Outside wanted area
    const value_index = o.set_value(x, y);
    change_begin = Math.min(change_begin, value_index);
    change_end = Math.max(change_end, value_index);
    queue.push(
      {x: x, y: y - 1},
      {x: x, y: y + 1},
      {x: x - 1, y: y},
      {x: x + 1, y: y},
    );
  }

  rcn_dispatch_ed_event('rcn_bin_change', {
    begin: change_begin,
    end: change_end + 1,
  });
}
