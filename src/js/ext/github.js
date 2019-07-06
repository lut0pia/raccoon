// Raccoon GitHub integration
'use strict';

function rcn_github_ed() {
  this.__proto__.__proto__ = rcn_window.prototype;
  rcn_window.call(this);

  let github_ed = this;

  // Create name input
  this.name_input = document.createElement('input');
  this.name_input.type = 'text';
  this.name_input.placeholder = 'Username';
  this.add_child(this.name_input);

  // Create password input
  this.password_input = document.createElement('input');
  this.password_input.type = 'password';
  this.password_input.placeholder = 'Password';
  this.add_child(this.password_input);

  // Create token input
  this.token_input = document.createElement('input');
  this.token_input.type = 'text';
  this.token_input.placeholder = 'Access token';
  this.token_input.onchange = function() {
    rcn_storage.github_token = this.value;
  }
  this.add_child(this.token_input);

  this.add_child(this.login_button = rcn_ui_button({
    value: 'Log In',
    onclick: function() {
      github_ed.login();
    },
  }));

  this.update_token_input();
}

rcn_github_ed.prototype.update_token_input = function() {
  this.token_input.value = rcn_storage.github_token || '';
}

rcn_github_ed.prototype.login = async function() {
  // Erase previous token to avoid authentification conflict
  delete rcn_storage.github_token;
  this.update_token_input();

  const username = this.name_input.value;
  const password = this.password_input.value;
  try {
    const auth = await rcn_github_request({
      url: '/authorizations',
      username: username,
      password: password,
      post: {
        scopes: ['public_repo'],
        note: 'raccoon_' + (new Date(Date.now())).toISOString(),
        note_url: location.origin,
      },
    });
    this.name_input.value = '';
    this.password_input.value = '';
    this.token_input.value = auth.token;
    rcn_storage.github_token = auth.token;
    alert('Log in success!');
  } catch(e) {
    alert('Log in failed: ' + e);
  }
}

rcn_github_ed.prototype.title = 'GitHub';
rcn_github_ed.prototype.type = 'github_ed';
rcn_github_ed.prototype.unique = true;

rcn_editors.push(rcn_github_ed);

async function rcn_github_request(p) {
  p = p instanceof Object ? p : {url: p};
  if(rcn_storage.github_token) {
    p.url += (p.url.search('\\?') >= 0) ? '&' : '?';
    p.url += 'access_token='+rcn_storage.github_token;
  }
  p.url = 'https://api.github.com'+p.url;
  return JSON.parse(await rcn_xhr(p));
}

async function rcn_github_get_commit(owner, repo, sha) {
  return rcn_github_request('/repos/'+owner+'/'+repo+'/git/commits/'+sha);
}

async function rcn_github_get_ref(owner, repo, ref) {
  return rcn_github_request('/repos/'+owner+'/'+repo+'/git/refs/'+ref);
}

async function rcn_github_get_tree(owner, repo, sha) {
  return rcn_github_request('/repos/'+owner+'/'+repo+'/git/trees/'+sha);
}

async function rcn_github_create_blob(owner, repo, content) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/git/blobs',
    post: {
      content: content,
      encoding: 'utf-8',
    },
  });
}

async function rcn_github_create_tree(owner, repo, base_tree, tree) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/git/trees',
    post: {
      base_tree: base_tree,
      tree: tree,
    },
  });
}

async function rcn_github_create_commit(owner, repo, parents, message, tree) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/git/commits',
    post: {
      message: message,
      tree: tree,
      parents: parents,
    },
  });
}

async function rcn_github_update_ref(owner, repo, ref, commit_sha, force) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/git/refs/'+ref,
    post: {
      sha: commit_sha,
      force: !!force,
    },
  });
}

async function rcn_github_merge(owner, repo, base, head) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/merges',
    post: {
      base: base,
      head: head,
    },
  });
}

function rcn_github_get_tree_bin_node(tree) {
  for(let i in tree.tree) {
    const node = tree.tree[i];
    if(node.type == 'blob' && node.path.endsWith('.rcn.json')) {
      return node;
    }
  }
  return null;
}

async function rcn_github_get_blob(owner, repo, sha) {
  const blob = await rcn_github_request('/repos/'+owner+'/'+repo+'/git/blobs/'+sha);
  if(blob.encoding == 'utf-8') {
    return blob.content;
  } else if(blob.encoding == 'base64') {
    return atob(blob.content);
  } else {
    throw 'Unknown blob encoding: '+ blob.encoding;
  }
}

rcn_hosts['github'] = {
  get_param: 'gh',
  pull_bin_from_link: async function(bin, link) {
    const pair = link.split('/');
    const owner = pair[0];
    const repo = pair[1];
    const ref = await rcn_github_get_ref(owner, repo, 'heads/master');
    const commit = await rcn_github_get_commit(owner, repo, ref.object.sha);
    const tree = await rcn_github_get_tree(owner, repo, commit.tree.sha);
    const node = rcn_github_get_tree_bin_node(tree);
    const json = await rcn_github_get_blob(owner, repo, node.sha);
    bin.from_json(JSON.parse(json));
    bin.host = 'github';
    bin.link = owner+'/'+repo+'/'+ref.object.sha;
    return bin;
  },
  sync_bin_with_link: async function(bin) {
    const pair = bin.link.split('/');
    const owner = pair[0];
    const repo = pair[1];
    const commit_sha = pair[2];
    const bin_json_text = bin.to_json_text();
    const commit = await rcn_github_get_commit(owner, repo, commit_sha);
    const tree = await rcn_github_get_tree(owner, repo, commit.tree.sha);
    const node = rcn_github_get_tree_bin_node(tree);
    const new_tree = await rcn_github_create_tree(owner, repo, tree.sha, [{
      path: node.path,
      mode: '100644', // Regular file
      type: 'blob',
      content: bin_json_text,
    }]);
    const commit_message = prompt('Commit message:', 'Autocommit from raccoon');
    const new_commit = await rcn_github_create_commit(owner, repo, [commit_sha], commit_message, new_tree.sha);
    let head_commit_sha = new_commit.sha;
    let head_tree_sha = new_commit.tree.sha;
    try { // Attempt fast-forward
      await rcn_github_update_ref(owner, repo, 'heads/master', head_commit_sha);
    } catch(e) {
      if(e == 422) { // Update ref failed, try merging
        const merge = await rcn_github_merge(owner, repo, 'master', head_commit_sha);
        head_commit_sha = merge.sha;
        head_tree_sha = merge.commit.tree.sha;
      } else { // Something else happened, pass it on
        throw e;
      }
    }
    const head_tree = await rcn_github_get_tree(owner, repo, head_tree_sha);
    const head_node = rcn_github_get_tree_bin_node(head_tree);
    const json = await rcn_github_get_blob(owner, repo, head_node.sha);
    bin.from_json(JSON.parse(json));
    bin.host = 'github';
    bin.link = owner+'/'+repo+'/'+head_commit_sha;
    return bin;
  },
}
