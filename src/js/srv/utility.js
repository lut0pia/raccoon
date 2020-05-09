'use strict';

exports.read_body = async function(msg) {
  return new Promise((resolve, reject) => {
    let body = '';
    msg.on('data', chunk => body += chunk.toString());
    msg.on('end', () => resolve(body));
    msg.on('error', e => reject(e));
  });
}
