'use strict';

const https = require('https');

const config = require('./config.js');
const utility = require('./utility.js');
const read_json_body = utility.read_json_body;
const write_json_body = utility.write_json_body;

exports.can_handle_request = function(request) {
  return request.url == '/oauth/github';
}
exports.handle_request = async function(request, response) {
  const params = await read_json_body(request);
  const gh_req = https.request({
    hostname: 'github.com',
    path: '/login/oauth/access_token',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  gh_req.on('response', async (gh_res) => {
    write_json_body(response, await read_json_body(gh_res));
  });
  gh_req.on('error', () => {
    response.writeHead(500);
    response.end();
  });
  gh_req.end(JSON.stringify({
    client_id: 'b5fd66cdee41f04ff6d3',
    client_secret: config.gh_client_secret,
    code: params.code,
    state: params.state,
  }));
}
