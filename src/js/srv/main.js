'use strict';

process.title = 'raccoon-server';

const http = require('http');
const ws = require('ws');

const config = require('./config.js');
const http_handlers = [
  require('./oauth.js'),
  require('./static_files.js'),
];
const ws_handlers = [
  require('./lobby.js'),
  require('./signal.js'),
];

console.log(`Creating HTTP server on port ${config.port}`);
const http_server = http.createServer(async (request, response) => {
  try {
    console.log(`Request: ${request.method} ${request.url}`);

    response.setHeader('Access-Control-Allow-Origin', config.allow_origin);
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if(request.method == 'OPTIONS') { // Asking for permission
      response.writeHead(200);
      response.end();
      return;
    }

    for(let handler of http_handlers) {
      if(handler.can_handle_request(request)) {
        return await handler.handle_request(request, response);
      }
    }

    // If we fell through here we have no handler for request
    response.writeHead(400);
    response.end('Bad Request');
  } catch(e) {
    console.log(`Uncaught exception '${e}' for request ${request.url}`);
    response.writeHead(500);
    response.end('Internal Server Error');
  }
});
http_server.listen(config.port);

console.log(`Creating WS server on port ${config.port}`);
let next_conn_id = 0;
new ws.Server({
  server: http_server,
}).on('connection', (conn, request) => {
  conn.id = next_conn_id++;
  console.log(`Connection: ${conn.id} (${request.socket.remoteAddress})`);
  for(let handler of ws_handlers) {
    if(handler.on_connect) {
      handler.on_connect(conn);
    }
  }
  conn.on('message', async msg => {
    const msg_object = JSON.parse(msg);
    for(let handler of ws_handlers) {
      if(handler.can_handle_message(conn, msg_object)) {
        return await handler.handle_message(conn, msg_object);
      }
    }
  });
  conn.on('close', (code, reason) => {
    console.log(`Disconnection: ${conn.id} (${code}: ${reason})`);
    for(let handler of ws_handlers) {
      if(handler.on_disconnect) {
        handler.on_disconnect(conn);
      }
    }
  });
});
