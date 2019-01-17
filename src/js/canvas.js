
const rcn_default_canvas_size = 128;

function rcn_canvas() {
  this.node = document.createElement('canvas');
  this.ctx = this.node.getContext('2d');
  this.ctx.imageSmoothingEnabled = false;
  this.width = rcn_default_canvas_size;
  this.height = rcn_default_canvas_size;
  document.body.appendChild(this.node);
  this.update_img();
}

rcn_canvas.prototype.update_img = function() {
  this.img = this.ctx.createImageData(this.width, this.height);
}

rcn_canvas.prototype.blit = function(x, y, w, h, pixels, palette) {
  // TODO: we're not respecting xywh for now because they're not useful
  for(var x = 0; x < w; x++) {
    for(var y = 0; y < h; y++) {
      var pixel_index = y*w+(x>>1);
      var pixel = pixels[pixel_index];
      if((x & 1) == 0) {
        pixel &= 0xf;
      } else {
        pixel >>= 4;
      }

      var img_pixel_index = y*w+x;
      this.img.data[img_pixel_index*4+0] = palette[pixel*3+0];
      this.img.data[img_pixel_index*4+1] = palette[pixel*3+1];
      this.img.data[img_pixel_index*4+2] = palette[pixel*3+2];
      this.img.data[img_pixel_index*4+3] = 255;
    }
  }

  // Blit the image to the canvas, at same pixel scale
  this.ctx.putImageData(this.img, 0, 0);

  // Scale up to fit the entire canvas
  this.ctx.setTransform(this.node.clientHeight/this.height, this.node.clientHeight/this.height, 0, 0, 0, 0);
  this.ctx.drawImage(this.ctx.canvas, 0, 0);
}

rcn_canvas.prototype.set_size = function(width, height) {
  this.width = width;
  this.height = height;
  this.update_img();
}
