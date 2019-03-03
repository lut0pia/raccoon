// Raccoon utility
// Honestly I don't know where else to put those

rcn_get_parameters = (function() {
  var params = {};
  location.search.substr(1).split('&')
  .forEach(function(item) {
    var pair = item.split("=");
    params[pair[0]] = decodeURIComponent(pair[1]);
  });
  return params;
})();

function rcn_download_file(p) {
  var e = document.createElement('a');
  e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(p.content));
  e.setAttribute('download', p.file_name);
  e.style.display = 'none';
  document.body.appendChild(e);
  e.click();
  document.body.removeChild(e);
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
