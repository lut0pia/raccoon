// Raccoon utility
// Honestly I don't know where else to put those
'use strict';

function rcn_download_file(p) {
  const e = document.createElement('a');
  e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(p.content));
  e.setAttribute('download', p.file_name);
  e.style.display = 'none';
  document.body.appendChild(e);
  e.click();
  document.body.removeChild(e);
}

function rcn_fullscreen(e) {
  (e.requestFullscreen ||
  e.mozRequestFullScreen || // Firefox
  e.webkitRequestFullscreen || // Chrome, Safari and Opera
  e.msRequestFullscreen || // IE/Edge
  function(){}).call(e);
}

function html_encode(text) {
  return text
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
}

const rcn_is_touch_device =
  'ontouchstart' in window ||
  navigator.maxTouchPoints;
