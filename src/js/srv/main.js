'use strict';

process.title = 'raccoon-server';

const fs = require('fs');
const https = require('https');
const http = require('http');
const md = require('markdown-it')()
  .use(require('markdown-it-anchor'));

const config = JSON.parse(fs.readFileSync('config.json'));

const ext_to_mime = {
  css: 'text/css',
  html: 'text/html',
  js: 'application/javascript',
  md: 'text/html',
  png: 'image/png',
  svg: 'image/svg+xml',
};

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

    const ext = filepath.substring(filepath.lastIndexOf(".") + 1);
    const mime_type = ext_to_mime[ext];
    if(mime_type) {
      response.setHeader('Content-Type', mime_type);
    }
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
http_server.listen(config.port);
