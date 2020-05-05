'use strict';

process.title = 'raccoon-server';

const fs = require('fs');
const https = require('https');
const http = require('http');
const md = require('markdown-it')()
  .use(require('markdown-it-anchor'));
const mime = new require('mime');

const cached_files = {};
function http_callback(request, response) {
  console.log(`Request: ${request.url}`)

  let filepath = request.url.split('?')[0];

  if(filepath == '/') {
    filepath = '/index.html';
  }
  filepath = filepath.substr(1);

  try {
    let content = cached_files[filepath];
    if(!content) {
      console.log(`Reading: ${filepath}`);
      content = fs.readFileSync(filepath);
      if(filepath.endsWith('.md')) {
        content = md.render(content.toString());
      }
      cached_files[filepath] = content;
    }
    response.setHeader('Content-Type', mime.getType(filepath));
    response.writeHead(200,);
    response.end(content);
  } catch(e) {
    console.log(`Cannot find ${request.url}: ${e}`);
    response.writeHead(404);
    response.end();
  }
}

let http_server;
try {
  const server_options = {
    // TODO: These values should change for another server, add a conf file?
    key: fs.readFileSync('/etc/letsencrypt/live/raccoon.computer/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/raccoon.computer/cert.pem')
  };
  http_server = https.createServer(server_options, http_callback);
} catch(e) {
  http_server = http.createServer(http_callback);
}
http_server.listen(80);
