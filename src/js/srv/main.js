'use strict';

process.title = 'raccoon-server';

const http = require('http');

const config = require('./config.js');
const handlers = [
  require('./oauth.js'),
  require('./static_files.js'),
];

async function http_callback(request, response) {
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

    for(let handler of handlers) {
      if(handler.can_handle_request(request)) {
        return handler.handle_request(request, response);
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
}

console.log(`Creating HTTP server on port ${config.port}`);
http.createServer(http_callback).listen(config.port);
