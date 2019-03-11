// Raccoon GitHub integration

function rcn_github_ed() {
  this.__proto__.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  // Create token input
  this.name_input = document.createElement('input');
  this.name_input.type = 'text';
  this.name_input.placeholder = 'Access token';
  this.name_input.value = rcn_storage.github_token || '';
  this.name_input.onchange = function() {
    rcn_storage.github_token = this.value;
  }
  this.add_child(this.name_input);
}

rcn_github_ed.prototype.title = 'GitHub';
rcn_github_ed.prototype.type = 'github_ed';
rcn_github_ed.prototype.unique = true;

rcn_editors.push(rcn_github_ed);

function rcn_github_request(p) {
  p = p instanceof Object ? p : {url: p};
  if(rcn_storage.github_token) {
    p.url += (p.url.search('\\?') >= 0) ? '&' : '?';
    p.url += 'access_token='+rcn_storage.github_token;
  }
  p.url = 'https://api.github.com'+p.url;
  return rcn_xhr(p).then(function(response_text) {
    try {
      return Promise.resolve(JSON.parse(response_text));
    } catch(e) {
      return Promise.reject(e);
    }
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

function rcn_github_create_blob(owner, repo, content) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/git/blobs',
    post: {
      content: content,
      encoding: 'utf-8',
    },
  });
}

function rcn_github_create_tree(owner, repo, base_tree, tree) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/git/trees',
    post: {
      base_tree: base_tree,
      tree: tree,
    },
  });
}

function rcn_github_create_commit(owner, repo, parents, message, tree) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/git/commits',
    post: {
      message: message,
      tree: tree,
      parents: parents,
    },
  });
}

function rcn_github_update_ref(owner, repo, ref, commit_sha, force) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/git/refs/'+ref,
    post: {
      sha: commit_sha,
      force: !!force,
    },
  });
}

function rcn_github_merge(owner, repo, base, head) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/merges',
    post: {
      base: base,
      head: head,
    },
  });
}

function rcn_github_get_tree_bin_node(tree) {
  for(var i in tree.tree) {
    const node = tree.tree[i];
    if(node.type == 'blob' && node.path.endsWith('.rcn.json')) {
      return node;
    }
  }
  return null;
}

function rcn_github_get_blob(owner, repo, sha) {
  return rcn_github_request('/repos/'+owner+'/'+repo+'/git/blobs/'+sha).then(function(blob) {
    if(blob.encoding == 'utf-8') {
      return Promise.resolve(blob.content);
    } else if(blob.encoding == 'base64') {
      return Promise.resolve(atob(blob.content));
    } else {
      return Promise.reject('Unknown blob encoding: '+ blob.encoding);
    }
  });
}

rcn_hosts['github'] = {
  get_param: 'gh',
  pull_bin_from_link: function(bin, link) {
    const pair = link.split('/');
    const owner = pair[0];
    const repo = pair[1];
    var commit_sha;
    return rcn_github_get_ref(owner, repo, 'heads/master').then(function(ref) {
      commit_sha = ref.object.sha;
      return rcn_github_get_commit(owner, repo, ref.object.sha)
    }).then(function(commit) {
      return rcn_github_get_tree(owner, repo, commit.tree.sha);
    }).then(function(tree) {
      const node = rcn_github_get_tree_bin_node(tree);
      return rcn_github_get_blob(owner, repo, node.sha);
    }).then(function(json) {
      try {
        bin.from_json(JSON.parse(json));
        bin.host = 'github';
        bin.link = owner+'/'+repo+'/'+commit_sha;
        return Promise.resolve(bin);
      } catch(e) {
        return Promise.reject(e);
      }
    });
  },
  sync_bin_with_link: function(bin) {
    const pair = bin.link.split('/');
    const owner = pair[0];
    const repo = pair[1];
    const commit_sha = pair[2];
    const bin_json_text = bin.to_json_text();
    var new_commit_sha;
    var new_tree_sha;
    return rcn_github_get_commit(owner, repo, commit_sha).then(function(commit) {
      return rcn_github_get_tree(owner, repo, commit.tree.sha);
    }).then(function(tree) {
      const node = rcn_github_get_tree_bin_node(tree);
      return rcn_github_create_tree(owner, repo, tree.sha, [{
        path: node.path,
        mode: '100644', // Regular file
        type: 'blob',
        content: bin_json_text,
      }]);
    }).then(function(tree) {
      const commit_message = prompt('Commit message:', 'Autocommit from raccoon');
      return rcn_github_create_commit(owner, repo, [commit_sha], commit_message, tree.sha);
    }).then(function(new_commit) {
      new_commit_sha = new_commit.sha;
      new_tree_sha = new_commit.tree.sha;
      return rcn_github_update_ref(owner, repo, 'heads/master', new_commit_sha);
    }).catch(function(e) {
      if(e == 422) { // Update ref failed, try merging
        return rcn_github_merge(owner, repo, 'master', new_commit_sha).then(function(merge) {
          new_commit_sha = merge.sha;
          new_tree_sha = merge.commit.tree.sha;
          return Promise.resolve();
        });
      } else { // Something else happened, pass it on
        throw e;
      }
    }).then(function() {
      return rcn_github_get_tree(owner, repo, new_tree_sha);
    }).then(function(tree) {
      const node = rcn_github_get_tree_bin_node(tree);
      return rcn_github_get_blob(owner, repo, node.sha);
    }).then(function(json) {
      try {
        bin.from_json(JSON.parse(json));
        bin.host = 'github';
        bin.link = owner+'/'+repo+'/'+new_commit_sha;
        return Promise.resolve(bin);
      } catch(e) {
        return Promise.reject(e);
      }
    });
  },
}
