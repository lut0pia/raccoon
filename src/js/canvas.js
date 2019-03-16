// Raccoon canvas

function rcn_canvas() {
  this.node = document.createElement('canvas');

  this.padding_x = 0;
  this.padding_y = 0;

  const gl = this.gl = this.node.getContext('webgl', {
    alpha: false,
  });
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  this.texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  this.img_program = rcn_gl_create_program(gl, `
    attribute vec4 vert;
    varying highp vec2 uv;
    void main(void) {
      uv = vert.zw;
      gl_Position = vec4(vert.xy, 0, 1);
    }
  `, `
    varying highp vec2 uv;
    uniform sampler2D sampler;

    void main(void) {
      gl_FragColor = texture2D(sampler, uv);
    }
  `);
  this.color_program = rcn_gl_create_program(gl, `
    attribute vec4 vert;
    void main(void) {
      gl_Position = vec4(vert.xy, 0, 1);
    }
  `, `
    uniform highp vec4 color;

    void main(void) {
      gl_FragColor = color;
    }
  `);
  this.vbo = rcn_gl_create_array_buffer(gl, new Float32Array([
    -1, -1, 0, 1,
    -1, 3, 0, -1,
    3, -1, 2, 1,
  ]));

  this.tick();
}

rcn_canvas.prototype.set_aspect_ratio = function(width, height) {
  this.node.width = width;
  this.node.height = height;
  this.flush();
}

rcn_canvas.prototype.tick = function() {
  this.removed_counter = this.removed_counter || 0;
  if(!document.body.contains(this.node) && ++this.removed_counter > 3) {
    // That canvas was removed from the visible DOM, bail
    return;
  }

  if(this.last_width !== this.node.clientWidth || this.last_height !== this.node.clientHeight) {
    this.flush();

    this.last_width = this.node.clientWidth;
    this.last_height = this.node.clientHeight;
  }

  var canvas = this;
  this.timeout_handle = setTimeout(function() { canvas.tick(); }, 50);
}

rcn_canvas.prototype.blit = function(x_start, y_start, width, height, pixels, palette) {
  if(!palette) {
    // Use current bin palette if unspecified
    palette = rcn_global_bin.rom.slice(rcn.mem_palette_offset, rcn.mem_palette_offset + rcn.mem_palette_size);
  }

  const x_end = x_start + width;
  const y_end = y_start + height;
  for(var x = x_start; x < x_end; x++) {
    for(var y = y_start; y < y_end; y++) {
      const pixel_index = y*(width>>1) + (x>>1); // Bitshift because pixels are 4bits
      var pixel = pixels[pixel_index];
      pixel = ((x & 1) == 0) ? (pixel & 0xf) : (pixel >> 4); // Deal with left or right pixel

      const cpixel_index = y*width + x;
      this.img[cpixel_index*4+0] = palette[pixel*3+0];
      this.img[cpixel_index*4+1] = palette[pixel*3+1];
      this.img[cpixel_index*4+2] = palette[pixel*3+2];
    }
  }
}

rcn_canvas.prototype.draw_quad = function(x, y, width, height, r, g, b, a) {
  const gl = this.gl;

  gl.viewport(x, this.node.height - height - y, width, height);

  gl.useProgram(this.color_program);
  gl.uniform4f(gl.getUniformLocation(this.color_program, 'color'), r, g, b, a);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
  gl.vertexAttribPointer(gl.getAttribLocation(this.color_program, 'vert'), 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(gl.getAttribLocation(this.color_program, 'vert'));

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

rcn_canvas.prototype.flush = function() {
  if(this.img) {
    const gl = this.gl;

    // Clear all to black
    gl.viewport(0, 0, this.node.width, this.node.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Render at the client size
    var client_width = this.node.clientWidth;
    var client_height = this.node.clientHeight;
    this.node.width = client_width;
    this.node.height = client_height;

    var vp = this.compute_viewport();
    gl.viewport(vp.x, vp.y, vp.width, vp.height);

    // Set and upload texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.img);

    gl.useProgram(this.img_program);
    gl.uniform1i(gl.getUniformLocation(this.img_program, 'sampler'), 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.vertexAttribPointer(gl.getAttribLocation(this.img_program, 'vert'), 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.getAttribLocation(this.img_program, 'vert'));

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if(this.onpostflush) {
    this.onpostflush();
  }
}

rcn_canvas.prototype.set_size = function(width, height) {
  if(this.width === width && this.height === height) {
    // Nothing to do
    return;
  }

  this.width = width;
  this.height = height;
  this.img = new Uint8Array(width * height * 4);

  // Set all alpha values to 255 in advance to avoid doing it later
  for(var i=3; i < this.img.length; i+=4) {
    this.img[i] = 255;
  }
}

rcn_canvas.prototype.client_to_texture_coords = function(x, y) {
  var vp = this.compute_viewport();
  if(vp.x <= x && vp.y <= y && x < vp.x + vp.width  && y < vp.y + vp.height) {
    return {
      x: Math.floor((x - vp.x) / vp.mul),
      y: Math.floor((y - vp.y) / vp.mul),
    };
  } else {
    return null;
  }
}

rcn_canvas.prototype.compute_viewport = function() {
  // We want to render pixel perfect, so we find a viewport size
  // that is a multiple of the texture size and fits the actual size
  const inner_width = this.node.width - this.padding_x;
  const inner_height = this.node.height - this.padding_y;
  const vp_mul = Math.floor(Math.min(inner_width / this.width, inner_height / this.height));
  const vp_width = vp_mul * this.width;
  const vp_height = vp_mul * this.height;
  const vp_x = (this.node.width - vp_width) / 2;
  const vp_y = (this.node.height - vp_height) / 2;
  return {
    mul: vp_mul,
    x: vp_x, y: vp_y,
    width: vp_width, height: vp_height,
  };
}
