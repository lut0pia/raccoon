// Raccoon GitHub helpers

function rcn_github_oauth_request() {
  rcn_storage.github_state = 'github_' + Math.random().toString().substr(2);
  location.replace('https://github.com/login/oauth/authorize?client_id=b5fd66cdee41f04ff6d3&scope=public_repo&state='+github_state)
}

function rcn_github_request(request) {
  return new Promise(function(resolve, reject) {
    rcn_xhr('https://api.github.com'+request).then(function(response_text) {
      try {
        resolve(JSON.parse(response_text));
      } catch(e) {
        reject(e);
      }
    });
  });
}

function rcn_github_get_commit(owner, repo, sha) {
  return rcn_github_request('/repos/'+owner+'/'+repo+'/git/commits/'+sha);
}

function rcn_github_get_ref(owner, repo, ref) {
  return rcn_github_request('/repos/'+owner+'/'+repo+'/git/refs/'+ref);
}

function rcn_github_get_tree(owner, repo, sha) {
  return rcn_github_request('/repos/'+owner+'/'+repo+'/git/trees/'+sha);
}

function rcn_github_get_blob(owner, repo, sha) {
  return new Promise(function(resolve, reject) {
    rcn_github_request('/repos/'+owner+'/'+repo+'/git/blobs/'+sha).then(function(blob) {
      if(blob.encoding == 'utf-8') {
        resolve(blob.content);
      } else if(blob.encoding == 'base64') {
        resolve(atob(blob.content));
      } else {
        reject();
      }
    });
  });
}

function rcn_github_get_master_tree(owner, repo) {
  return rcn_github_get_ref(owner, repo, 'heads/master').then(function(ref) {
    return rcn_github_get_commit(owner, repo, ref.object.sha);
  }).then(function(commit) {
    return rcn_github_get_tree(owner, repo, commit.tree.sha);
  });
}
