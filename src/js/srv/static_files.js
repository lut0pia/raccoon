'use strict';

const fs = require('fs');

const ext_to_mime = {
  css: 'text/css',
  html: 'text/html',
  js: 'application/javascript',
  md: 'text/plain',
  png: 'image/png',
  svg: 'image/svg+xml',
};

exports.http_callback = function(request, response) {
  let filepath = request.url.split('?')[0];

  if(filepath == '/') {
    filepath = '/index.html';
  }
  filepath = filepath.substr(1);

  const content = fs.readFileSync(filepath);
  const ext = filepath.substring(filepath.lastIndexOf(".") + 1);
  const mime_type = ext_to_mime[ext];
  if(mime_type) {
    response.setHeader('Content-Type', mime_type);
  }
  response.writeHead(200);
  response.end(content);
}
