// Raccoon URL helpers

rcn_get_parameters = (function() {
  var params = {};
  location.search.substr(1).split('&')
  .forEach(function(item) {
    var pair = item.split("=");
    params[pair[0]] = decodeURIComponent(pair[1]);
  });
  return params;
})();
