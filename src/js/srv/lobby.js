'use strict';

const pools = {};

const remove_client = function(conn) {
  for(let pool of Object.values(pools)) {
    const index = pool.group.indexOf(conn);
    if(index >= 0) {
      pool.group.splice(index, 1);
      console.log(`Client ${conn.id} leaves pool ${pool.name}`);
    }
  }
}
exports.on_disconnect = function(conn) {
  remove_client(conn);
}
exports.can_handle_message = function(conn, msg) {
  return msg.type == 'lobby';
}
exports.handle_message = async function(conn, msg) {
  remove_client(conn);

  // Get or create pool
  const pool_name = `${msg.game_hash}-${msg.group_size}`;
  if(!pools[pool_name]) {
    pools[pool_name] = {
      name: pool_name,
      game_hash: msg.game_hash,
      group_size: msg.group_size,
      group_index: 0,
      group: [],
    };
  }

  // Add client to pool
  const pool = pools[pool_name];
  console.log(`Client ${conn.id} joins pool ${pool.name}`);
  pool.group.push(conn);

  // Check if group is ready
  if(pool.group.length == pool.group_size) {
    // Send clients group information
    const group_ids = pool.group.map(c => c.id);
    console.log(`Group is ready for pool ${pool.name}`);
    for(let i = 0; i < pool.group.length; i++) {
      pool.group[i].send(JSON.stringify({
        type: 'group',
        index: i,
        group_ids: group_ids,
      }));
    }

    // Reset pool group
    pool.group = [];
  }
}
