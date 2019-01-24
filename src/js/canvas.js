// Raccoon canvas

function rcn_canvas() {
  this.node = document.createElement('canvas');
  this.ctx = this.node.getContext('2d');
  this.ctx.imageSmoothingEnabled = false;
  this.set_size(384, 384, 128, 128);
}

rcn_canvas.prototype.blit = function(x_start, y_start, width, height, pixels, palette) {
  const x_ratio = this.node.clientWidth / this.width;
  const y_ratio = this.node.clientHeight / this.height;

  const cx_start = Math.floor(x_start * x_ratio);
  const cy_start = Math.floor(y_start * y_ratio);
  const cwidth = Math.floor(width * x_ratio);
  const cheight = Math.floor(height * y_ratio);
  const cx_end = cx_start + cwidth;
  const cy_end = cy_start + cheight;
  for(var cx = cx_start; cx < cx_end; cx++) {
    for(var cy = cy_start; cy < cy_end; cy++) {
      const x = Math.floor(cx / x_ratio);
      const y = Math.floor(cy / y_ratio);
      const pixel_index = y*(width>>1) + (x>>1); // Bitshift because pixels are 4bits
      var pixel = pixels[pixel_index];
      pixel = ((x & 1) == 0) ? (pixel & 0xf) : (pixel >> 4); // Deal with left or right pixel

      const cpixel_index = cy*(this.img.width) + cx;
      this.img.data[cpixel_index*4+0] = palette[pixel*3+0];
      this.img.data[cpixel_index*4+1] = palette[pixel*3+1];
      this.img.data[cpixel_index*4+2] = palette[pixel*3+2];
    }
  }
}

rcn_canvas.prototype.flush = function() {
  this.ctx.putImageData(this.img, 0, 0);
}

rcn_canvas.prototype.set_size = function(width, height, internal_width, internal_height) {
  this.node.width = width;
  this.node.height = height;
  this.width = internal_width;
  this.height = internal_height;
  this.img = this.ctx.createImageData(width, height);
  
  // Set all alpha values to 255 in advance to avoid doing it later
  for(var i=3; i < this.img.data.length; i+=4) {
    this.img.data[i] = 255;
  }
}
