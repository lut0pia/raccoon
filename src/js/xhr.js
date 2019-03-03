// Raccoon XMLHttpRequest helper

function rcn_xhr(p) {
  return new Promise(function(resolve, reject) {
    p = p instanceof Object && p || {url: p};
    const post_data = p.post && JSON.stringify(p.post);

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        if(xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
        } else {
          reject(xhr.status);
        }
      }
    };

    const url = p.url;
    xhr.open(post_data ? 'POST' : 'GET', url, true);

    const username = p.username;
    const password = p.password;
    if(username && password) {
      xhr.setRequestHeader('Authorization', 'Basic ' + btoa(username+':'+password));
    }

    if(post_data) {
      xhr.setRequestHeader('Content-Type', 'application/json');
    }

    xhr.send(post_data);
  });
}
