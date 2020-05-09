'use strict';

const fs = require('fs');

const config = require('./config.js');

const ext_to_mime = {
  css: 'text/css',
  html: 'text/html',
  js: 'application/javascript',
  md: 'text/plain',
  png: 'image/png',
  svg: 'image/svg+xml',
};

exports.can_handle_request = function(request) {
  return config.serve_static_files;
}
exports.handle_request = function(request, response) {
  let filepath = request.url.split('?')[0];

  if(filepath == '/') {
    filepath = '/index.html';
  }
  filepath = filepath.substr(1);

  try {
    const content = fs.readFileSync(filepath);
    const ext = filepath.substring(filepath.lastIndexOf(".") + 1);
    const mime_type = ext_to_mime[ext];
    if(mime_type) {
      response.setHeader('Content-Type', mime_type);
    }
    response.writeHead(200);
    response.end(content);
  } catch(e) {
    response.writeHead(404);
    response.end('<h1>File not found</h1>');
  }
}
