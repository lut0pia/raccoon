'use strict';

const id_to_conn = {};

exports.on_connect = function(conn) {
  id_to_conn[conn.id] = conn;
}
exports.on_disconnect = function(conn) {
  delete id_to_conn[conn.id];
}
exports.can_handle_message = function(conn, msg) {
  return msg.type = 'signal';
}
exports.handle_message = async function(conn, msg) {
  const other_conn = id_to_conn[msg.dst];
  if(other_conn) {
    console.log(`Signal from ${conn.id} to ${msg.dst}`);
    other_conn.send(JSON.stringify({
      type: 'signal',
      src: conn.id,
      msg: msg.msg,
    }));
  }
}
