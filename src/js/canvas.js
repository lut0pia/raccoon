// Raccoon canvas

const rcn_default_canvas_size = 128;

function rcn_canvas() {
  this.node = document.createElement('canvas');
  this.ctx = this.node.getContext('2d');
  this.ctx.imageSmoothingEnabled = false;
  this.width = rcn_default_canvas_size;
  this.height = rcn_default_canvas_size;
  this.node.width = this.width * 3;
  this.node.height = this.height * 3;
  document.body.appendChild(this.node);
}

rcn_canvas.prototype.blit = function(x_start, y_start, w, h, pixels, palette) {
  // Convert byte palette to css palette (e.g. #ffffff)
  var css_palette = [];
  for(var i=0; i<16; i++) {
    var css_value = '#';
    for(var j=0; j<3; j++) {
      css_value += ('00'+palette[i*3+j].toString(16)).slice(-2);
    }
    css_palette.push(css_value);
  }

  var x_ratio = this.node.clientWidth/this.width;
  var y_ratio = this.node.clientHeight/this.height;
  var ratio = Math.min(x_ratio, y_ratio);

  for(var x = 0; x < w; x++) {
    for(var y = 0; y < h; y++) {
      var pixel_index = y*(w>>1)+(x>>1);
      var pixel = pixels[pixel_index];
      if((x & 1) == 0) {
        pixel &= 0xf; // Left pixel
      } else {
        pixel >>= 4; // Right pixel
      }
      
      this.ctx.fillStyle = css_palette[pixel];
      this.ctx.fillRect((x_start+x)*ratio, (y_start+y)*ratio, ratio, ratio);
    }
  }
}

rcn_canvas.prototype.set_size = function(width, height) {
  this.width = width;
  this.height = height;
}
