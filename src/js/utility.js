// Raccoon utility
// Honestly I don't know where else to put those
'use strict';

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
