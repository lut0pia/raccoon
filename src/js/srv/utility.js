'use strict';

const read_body = exports.read_body = async function(msg) {
  return new Promise((resolve, reject) => {
    let body = '';
    msg.on('data', chunk => body += chunk.toString());
    msg.on('end', () => resolve(body));
    msg.on('error', e => reject(e));
  });
}

exports.read_json_body = async function(msg) {
  return JSON.parse(await read_body(msg));
}

const write_body = exports.write_body = function(res, body) {
  res.writeHead(200);
  res.end(body);
}

exports.write_json_body = function(res, object) {
  res.setHeader('Content-Type', 'application/json');
  write_body(res, JSON.stringify(object));
}
