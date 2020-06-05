// WebGL helper functions
'use strict';

function rcn_gl_create_shader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log('GL: Shader compile error: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function rcn_gl_create_program(gl, vs_source, fs_source) {
  const program = gl.createProgram();
  gl.attachShader(program, rcn_gl_create_shader(gl, gl.VERTEX_SHADER, vs_source));
  gl.attachShader(program, rcn_gl_create_shader(gl, gl.FRAGMENT_SHADER, fs_source));
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log('GL: Program link error: ' + gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

function rcn_gl_create_array_buffer(gl, array) {
  const array_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, array_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);
  return array_buffer;
}
