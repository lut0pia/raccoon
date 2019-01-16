
const rcn_default_canvas_size = 128;

function rcn_canvas() {
  this.node = document.createElement('canvas');
  this.ctx = this.node.getContext('2d');
  this.width = rcn_default_canvas_size;
  this.height = rcn_default_canvas_size;
  document.body.appendChild(this.node);
}

rcn_canvas.prototype.set_pixel = function(x, y, c) {
  this.ctx.fillStyle = c;
  var x_ratio = this.node.clientWidth / this.width;
  var y_ratio = this.node.clientHeight / this.height;
  this.ctx.fillRect(x*x_ratio, y*y_ratio, x_ratio, y_ratio);
}

rcn_canvas.prototype.set_size = function(width, height) {
  this.width = width;
  this.height = height;
}
