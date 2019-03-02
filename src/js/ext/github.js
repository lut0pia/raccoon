// Raccoon GitHub integration

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

rcn_hosts['github'] = {
  get_param: 'gh',
  load_bin_from_link: function(link) {
    const pair = link.split('/');
    const owner = pair[0];
    const repo = pair[1];
    return rcn_github_get_master_tree(owner, repo).then(function(tree) {
      for(var i in tree.tree) {
        const node = tree.tree[i];
        if(node.type == 'blob' && node.path.endsWith('.rcn.json')) {
          return rcn_github_get_blob(owner, repo, node.sha).then(function(json) {
            try {
              var bin = new rcn_bin();
              bin.from_json(JSON.parse(json));
              return Promise.resolve(bin);
            } catch(e) {
              return Promise.reject(e);
            }
          });
        }
      }
      return Promise.reject();
    });
  },
}
