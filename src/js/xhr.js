// Raccoon XMLHttpRequest helper

function rcn_xhr(p) {
  return new Promise(function(resolve, reject) {
    var form_data = new FormData();
    var post_data = p instanceof Object && p.data;
    if(post_data) {
      for(var key in post_data) {
        switch(typeof(post_data[key])) {
          case 'string': case 'number': case 'boolean': form_data.append(key, post_data[key]); break;
          case 'object': form_data.append(key, post_data[key], post_data[key].name); break; // File
        }
      }
    }

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        if(xhr.status == 200) {
          resolve(xhr.responseText);
        } else {
          reject(xhr.status);
        }
      }
    };

    var url = p instanceof Object ? p.url : p;
    if(post_data) {
      xhr.open('POST', url, true);
      xhr.send(form_data);
    } else {
      xhr.open('GET', url, true);
      xhr.send();
    }
  });
}
