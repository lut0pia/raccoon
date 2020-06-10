// Raccoon XMLHttpRequest helper
'use strict';

async function rcn_http_request(p) {
  return new Promise(function(resolve, reject) {
    p = p instanceof Object && p || {url: p};
    const post_data = p.post && JSON.stringify(p.post);

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        if(xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
        } else {
          xhr.toString = () => this.statusText;
          reject(xhr);
        }
      }
    };

    const method = p.method || (post_data ? 'POST' : 'GET');
    xhr.open(method, p.url, true);

    const username = p.username;
    const password = p.password;
    if(username && password) {
      xhr.setRequestHeader('Authorization', 'Basic ' + btoa(username+':'+password));
    }

    if(post_data) {
      xhr.setRequestHeader('Content-Type', 'application/json');
    }

    if(p.headers) {
      for(let name in p.headers) {
        xhr.setRequestHeader(name, p.headers[name]);
      }
    }

    xhr.send(post_data);
  });
}
