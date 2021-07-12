// Raccoon canvas
'use strict';

function rcn_canvas(params) {
  params = params || {};

  this.node = document.createElement('canvas');
  this.node.rcn_canvas = this;

  this.padding_x = 0;
  this.padding_y = 0;
  this.min_vp_mul = 1;

  this.onpostflush = [];

  const gl = this.gl = this.node.getContext('webgl');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  this.texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  this.palette = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, this.palette);
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
    uniform highp vec2 tex_size;
    uniform sampler2D palette;

    void main(void) {
      lowp float sample = texture2D(sampler, uv).r * 255.0;
      sample = mod(uv.x * tex_size.x, 2.0) > 1.0
        ? floor(sample / 16.0)
        : mod(sample, 16.0);
      sample = sample / 16.0;
      lowp vec4 pal = texture2D(palette, vec2(sample, 0.0));
      gl_FragColor.rgb = pal.rgb;`
      + (params.ignore_alpha
      ? `
      gl_FragColor.a = 1.0;`
      : `
      lowp float checker = mod(floor(gl_FragCoord.x / 8.0) + floor(gl_FragCoord.y / 8.0), 2.0);
      gl_FragColor.a = floor(pal.a * 2.0) == 1.0 ? (checker == 0.0 ? 1.0 : 0.5) : 1.0;`)
      + `
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

  if(!params.no_palette_init) {
    this.upload_palette();
  }
}

rcn_canvas.prototype.upload_palette = function(palette) {
  if(!palette) {
    // Use current bin palette if unspecified
    palette = rcn_global_bin.rom.slice(rcn.mem_palette_offset, rcn.mem_palette_offset + rcn.mem_palette_size);
  }

  const gl = this.gl;
  gl.bindTexture(gl.TEXTURE_2D, this.palette);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, palette.length / 4, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, palette);
}

rcn_canvas.prototype.upload_pixels = function(pixels) {
  if(pixels) {
    this.pixels = pixels;
  }

  const gl = this.gl;
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, this.width / 2, this.height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.pixels);
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

rcn_canvas.prototype.draw_outline = function(x, y, w, h, t, r, g, b, a) {
  this.draw_quad(x - t, y - t, t, h + t * 2, r, g, b, a);
  this.draw_quad(x + w, y - t, t, h + t * 2, r, g, b, a);
  this.draw_quad(x, y - t, w, t, r, g, b, a);
  this.draw_quad(x, y + h, w, t, r, g, b, a);
}

rcn_canvas.prototype.flush = function() {
  if(this.pixels) {
    const gl = this.gl;

    // Clear all to black
    gl.viewport(0, 0, this.node.width, this.node.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // I think this resets the aspect ratio of the canvas
    this.node.width = this.width;
    this.node.height = this.height;

    // Render at the client size
    const client_width = this.node.clientWidth;
    const client_height = this.node.clientHeight;
    this.node.width = client_width;
    this.node.height = client_height;

    const vp = this.compute_viewport();
    gl.viewport(vp.x, vp.y, vp.width, vp.height);

    // Set and upload texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.palette);

    gl.useProgram(this.img_program);
    gl.uniform1i(gl.getUniformLocation(this.img_program, 'sampler'), 0);
    gl.uniform2f(gl.getUniformLocation(this.img_program, 'tex_size'), this.width, this.height);
    gl.uniform1i(gl.getUniformLocation(this.img_program, 'palette'), 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.vertexAttribPointer(gl.getAttribLocation(this.img_program, 'vert'), 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(gl.getAttribLocation(this.img_program, 'vert'));

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  for(let ops of this.onpostflush) {
    ops.apply(this);
  }
}

rcn_canvas.prototype.set_size = function(width, height) {
  if(this.width === width && this.height === height) {
    // Nothing to do
    return;
  }

  this.node.style.minWidth = (width*this.min_vp_mul)+'px';
  this.node.style.minHeight = (height*this.min_vp_mul)+'px';

  this.width = width;
  this.height = height;
  this.pixels = new Uint8Array(width * height / 2);
}

rcn_canvas.prototype.client_to_texture_coords = function(x, y) {
  const vp = this.compute_viewport();
  if(vp.x <= x && vp.y <= y && x < vp.x + vp.width && y < vp.y + vp.height) {
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
  const vp_mul = Math.max(this.min_vp_mul, Math.floor(Math.min(inner_width / this.width, inner_height / this.height)));
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

rcn_canvas.prototype.interaction = function(f) {
  const canvas = this;
  let focused = false;
  const event_callback = function(e) {
    if(e.buttons > 0) {
      const canvas_coords = this.getBoundingClientRect();
      const tex_coords = canvas.client_to_texture_coords(e.clientX - canvas_coords.x, e.clientY - canvas_coords.y);
      if(tex_coords) {
        if(e.type == 'mousedown') {
          focused = true;
        }
        if(focused) {
          f(e, tex_coords);
        }
      }
    } else {
      focused = false;
    }
  }
  this.node.addEventListener('contextmenu', function(e){e.preventDefault()});
  this.node.addEventListener('mousedown', event_callback);
  this.node.addEventListener('mousemove', event_callback);
}
