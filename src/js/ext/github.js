// Raccoon GitHub integration
'use strict';

async function rcn_github_login() {
  return new Promise((resolve, reject) => {
    localStorage.github_state = `github_${Math.random().toString().substr(2)}`;
    localStorage.github_token = 'pending';
    const popup = window.open('https://github.com/login/oauth/authorize'
      +'?client_id=b5fd66cdee41f04ff6d3'
      +'&scope=public_repo'
      +`&state=${localStorage.github_state}`,
      '', 'width=512,height=512');
    if(popup) {
      rcn_overlay_push();
      let interval;
      interval = setInterval(function() {
        if(localStorage.github_token != 'pending') {
          delete localStorage.github_state;
          if(localStorage.github_token) {
            resolve();
          } else {
            reject('Unknown error');
          }
          rcn_overlay_pop();
          clearInterval(interval);
        }
      }, 200);
    } else {
      reject(`Unable to open login popup`);
    }
  });
}

(async () => {
  if(rcn_get_parameters.code &&
    rcn_get_parameters.state == localStorage.github_state) {
    const response = JSON.parse(await rcn_http_request({
      url: '/oauth/github',
      post: {
        code: rcn_get_parameters.code,
        state: rcn_get_parameters.state,
      },
    }));
    if(response.access_token) {
      localStorage.github_token = response.access_token;
    } else {
      delete localStorage.github_token;
    }
    window.close();
  }
})();

async function rcn_github_request(p) {
  p = p instanceof Object ? p : {url: p};
  if(p.requires_token) {
    if(!localStorage.github_token ||
      localStorage.github_token == 'pending') {
      await rcn_github_login();
    }
    p.headers = p.headers || {};
    p.headers['Authorization'] = `token ${localStorage.github_token}`;
  }
  p.url = `https://api.github.com${p.url}`;
  return JSON.parse(await rcn_http_request(p));
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

async function rcn_github_create_repo(repo) {
  return rcn_github_request({
    url: '/user/repos',
    requires_token: true,
    post: {
      name: repo,
      description: 'Automatically created by raccoon',
      auto_init: true,
    },
  });
}

async function rcn_github_create_blob(owner, repo, content) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/git/blobs',
    requires_token: true,
    post: {
      content: content,
      encoding: 'utf-8',
    },
  });
}

async function rcn_github_create_tree(owner, repo, base_tree, tree) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/git/trees',
    requires_token: true,
    post: {
      base_tree: base_tree,
      tree: tree,
    },
  });
}

async function rcn_github_create_commit(owner, repo, parents, message, tree) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/git/commits',
    requires_token: true,
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
    requires_token: true,
    post: {
      sha: commit_sha,
      force: !!force,
    },
  });
}

async function rcn_github_merge(owner, repo, base, head) {
  return rcn_github_request({
    url: '/repos/'+owner+'/'+repo+'/merges',
    requires_token: true,
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
  display_name: 'GitHub',
  get_param: 'gh',
  read: async function(o) {
    const pair = o.link.split('/');
    const owner = pair[0];
    const repo = pair[1];
    let commit_sha = pair[2];
    if(o.latest || (!commit_sha && o.any)) {
      const ref = await rcn_github_get_ref(owner, repo, 'heads/master');
      commit_sha = ref.object.sha;
    } else if(!commit_sha) {
      throw 'Incomplete link to read';
    }
    const commit = await rcn_github_get_commit(owner, repo, commit_sha);
    const tree = await rcn_github_get_tree(owner, repo, commit.tree.sha);
    const node = rcn_github_get_tree_bin_node(tree);
    return {
      text: await rcn_github_get_blob(owner, repo, node.sha),
      host: 'github',
      link: `${owner}/${repo}/${commit_sha}`,
    };
  },
  write: async function(o) {
    const pair = o.link.split('/');
    const owner = pair[0];
    const repo = pair[1];

    try {
      await rcn_github_create_repo(repo);
    } catch(e) {
      if(e.status == 422 && e.responseText.search('name already exists') >= 0) {
        // Repository already exists
      } else {
        throw e;
      }
    }

    const new_tree = await rcn_github_create_tree(owner, repo, undefined, [{
      path: o.name,
      mode: '100644', // Regular file
      type: 'blob',
      content: o.text,
    }]);
    const new_commit = await rcn_github_create_commit(owner, repo, undefined, 'Push from raccoon', new_tree.sha);
    await rcn_github_update_ref(owner, repo, 'heads/master', new_commit.sha, true);
    return {
      text: o.text,
      host: 'github',
      link: `${owner}/${repo}/${new_commit.sha}`,
    };
  },
  sync: async function(o) {
    const pair = o.link.split('/');
    const owner = pair[0];
    const repo = pair[1];
    const commit_sha = pair[2];
    const commit = await rcn_github_get_commit(owner, repo, commit_sha);
    const tree = await rcn_github_get_tree(owner, repo, commit.tree.sha);
    const node = rcn_github_get_tree_bin_node(tree);
    const new_tree = await rcn_github_create_tree(owner, repo, tree.sha, [{
      path: node.path,
      mode: '100644', // Regular file
      type: 'blob',
      content: o.text,
    }]);
    const commit_message = await rcn_ui_prompt('Commit message:', 'Commit from raccoon');
    const new_commit = await rcn_github_create_commit(owner, repo, [commit_sha], commit_message, new_tree.sha);
    let head_commit_sha = new_commit.sha;
    let head_tree_sha = new_commit.tree.sha;
    try { // Attempt fast-forward
      await rcn_github_update_ref(owner, repo, 'heads/master', head_commit_sha);
    } catch(e) {
      if(e.status == 422) { // Update ref failed, try merging
        try {
          const merge = await rcn_github_merge(owner, repo, 'master', head_commit_sha);
          head_commit_sha = merge.sha;
          head_tree_sha = merge.commit.tree.sha;
        } catch(e) {
          if(e.status == 409) {
            throw 'conflict';
          } else {
            throw `Merge failure: ${e}`;
          }
        }
      } else {
        throw `Fast-forward failure: ${e}`;
      }
    }
    const head_tree = await rcn_github_get_tree(owner, repo, head_tree_sha);
    const head_node = rcn_github_get_tree_bin_node(head_tree);
    return {
      text: await rcn_github_get_blob(owner, repo, head_node.sha),
      host: 'github',
      link: `${owner}/${repo}/${head_commit_sha}`,
    };
  },
  import: async function() {
    return (await rcn_github_request({
      url: '/user/repos',
      requires_token: true,
    })).map(r => ({
      name: r.name,
      link: r.full_name,
    }));
  },
}
