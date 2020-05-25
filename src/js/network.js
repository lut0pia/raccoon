// Raccoon network
'use strict';

const rcn_rtc_conf = {iceServers: [
  {urls: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
  ]},
]};

function rcn_network() {
  this.reset();
}

rcn_network.prototype.update = function(vm) {
  vm.worker.postMessage({
    type: 'network',
    subtype: 'update',
    ready: this.is_connected(),
    index: this.index,
  });
  for(let msg of this.msg_queue) {
    vm.worker.postMessage(msg);
  }
  this.msg_queue = [];
}

rcn_network.prototype.on_vm_message = function(vm, msg) {
  if(msg.subtype == 'connect') {
    this.reset();
    if(msg.group_size > 1) {
      this.connect(msg.group_size, msg.group_match);
    }
  } else {
    const msg_text = JSON.stringify(msg);
    if(this.server_connection) {
      this.server_connection.channel.send(msg_text);
    } else {
      for(let client_connection of Object.values(this.client_connections)) {
        client_connection.channel.send(msg_text);
      }
    }
  }
}

rcn_network.prototype.reset = function() {
  const connections = Object.values(this.client_connections || {})
    .concat([this.server_connection]);
  for(let connection of connections) {
    if(connection) {
      connection.close();
      if(connection.data) {
        connection.close();
      }
    }
  }
  delete this.index;
  delete this.server_connection;
  this.client_connections = {};
  this.msg_queue = [];
}

rcn_network.prototype.compute_game_hash = function(code) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (((hash << 5) - hash) + code.charCodeAt(i)) & 0xffffffff;
  }
  this.game_hash = Math.abs(hash).toString(16).padStart(8, '0');
}

rcn_network.prototype.is_connected = function() {
  const clients = Object.values(this.client_connections);
  return this.index !== undefined &&
    ((this.server_connection && this.server_connection.channel.readyState === 'open') ||
    (clients.length > 0 && clients.every(c => c.channel && c.channel.readyState === 'open')));
}

rcn_network.prototype.connect = function(group_size, group_match) {
  const network = this;
  const wsp = location.protocol == 'http:' ? 'ws:' : 'wss:';
  this.ws = new WebSocket(`${wsp}//${location.host}/ws`);
  this.ws.addEventListener('open', e => {
    network.ws.send(JSON.stringify({
      type: 'lobby',
      group_size: group_size,
      game_hash: `${network.game_hash}-${group_match}`,
    }));
  });
  this.ws.addEventListener('message', async e => {
    let msg = JSON.parse(e.data);
    let src;
    if(msg.type == 'signal') {
      src = msg.src;
      msg = msg.msg;
      console.log(src, '->', msg);
    } else {
      console.log('->', msg);
    }
    switch(msg.type) {
      case 'group':
        network.index = msg.index;
        network.group_ids = msg.group_ids;
        if(network.index > 0) {
          network.server_connection = network.create_peer_connection(true);
          const offer = await network.server_connection.createOffer();
          await network.server_connection.setLocalDescription(offer);
          // Send offer to server
          network.signal(network.group_ids[0], {
            type: 'offer',
            offer: offer,
          });
        }
        break;
      case 'offer': {
        const connection = network.client_connections[src] =
          network.client_connections[src] || network.create_peer_connection();
        connection.setRemoteDescription(msg.offer);
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        network.signal(src, {
          type: 'answer',
          answer: answer,
        });
        break;
      }
      case 'answer':
        if(network.group_ids[0] == src) {
          await network.server_connection.setRemoteDescription(msg.answer);
        }
        break;
      case 'ice': {
        const connection = network.client_connections[src] || network.server_connection;
        await connection.addIceCandidate(msg.ice);
        break;
      }
    }
  });
}

rcn_network.prototype.create_peer_connection = function(create_channel) {
  const network = this;
  const connection = new RTCPeerConnection(rcn_rtc_conf);
  if(create_channel) {
    connection.channel = connection.createDataChannel('data', {
      maxRetransmits: 0, // YOLO
      ordered: false, // LYOO
    });
    this.configure_channel(connection.channel);
  }
  connection.addEventListener('datachannel', e => {
    connection.channel = e.channel;
    network.configure_channel(connection.channel);
  });
  connection.addEventListener('icecandidate', e => {
    if(!e.candidate) {
      return;
    }
    if(network.index > 0) {
      network.signal(network.group_ids[0], {
        type: 'ice',
        ice: e.candidate,
      });
    } else {
      for(let i = 1; i < network.group_ids.length; i++) {
        network.signal(network.group_ids[i], {
          type: 'ice',
          ice: e.candidate,
        });
      }
    }
  });
  return connection;
}

rcn_network.prototype.configure_channel = function(channel) {
  const network = this;
  channel.addEventListener('message', e => {
    const msg = JSON.parse(e.data);
    for(let i in network.client_connections) {
      const client = network.client_connections[i];
      const index = network.group_ids.indexOf(parseInt(i));
      if(client.channel == e.target && index >= 0) {
        msg.index = index;
        break;
      }
    }
    network.msg_queue.push(msg);
  });
  channel.addEventListener('error', e => console.log(e));
  channel.addEventListener('close', e => console.log(e));
}

rcn_network.prototype.signal = function(dst, msg) {
  console.log(dst, '<-', msg);
  this.ws.send(JSON.stringify({
    type: 'signal',
    dst: dst,
    msg: msg,
  }));
}
