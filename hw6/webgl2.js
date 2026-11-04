// Small WebGL 2 renderer based on the course starter.
function gl_start(canvas, scene) {
  const gl=canvas.getContext('webgl2',{antialias:true,alpha:false});
  const error=document.getElementById('error');
  if(!gl){error.textContent='WebGL 2 is unavailable. Please open this page in a browser with hardware acceleration enabled.';return;}
  try {
    const program=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,scene.vertexShader],[gl.FRAGMENT_SHADER,scene.fragmentShader]]){
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);
    }
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    gl.clearColor(8/255,15/255,25/255,1);
    const uniforms=new Map();
    const setUniform=(type,name,...values)=>{
      if(!uniforms.has(name))uniforms.set(name,gl.getUniformLocation(program,name));
      gl['uniform'+type](uniforms.get(name),...values);
    };
    // Upload each distinct mesh once; repeated spheres share GPU buffers.
    const meshes=new Map();
    for(const shape of scene.shapes){
      if(!meshes.has(shape.vertices)){
        const vao=gl.createVertexArray();gl.bindVertexArray(vao);
        const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(shape.vertices),gl.STATIC_DRAW);
        for(const [name,attribute] of Object.entries(scene.vertexAttributes)){
          const location=gl.getAttribLocation(program,name);if(location<0)continue;
          gl.enableVertexAttribArray(location);
          gl.vertexAttribPointer(location,attribute.size,gl.FLOAT,false,scene.vertexSize*4,attribute.position*4);
        }
        meshes.set(shape.vertices,{vao,count:shape.vertices.length/scene.vertexSize});
      }
      shape.mesh=meshes.get(shape.vertices);
    }
    const inverse=new Matrix();
    const render=()=>{
      const size=Math.min(1600,Math.round(canvas.clientWidth*Math.min(devicePixelRatio||1,2)));
      if(canvas.width!==size||canvas.height!==size){canvas.width=size;canvas.height=size;}
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      scene.update();
      for(const shape of scene.shapes){
        // HOMEWORK 3: the forward and inverse matrices belong to THIS shape.
        setUniform('Matrix4fv','uMF',false,shape.matrix.get());
        inverse.set(shape.matrix.get());inverse.inverse();
        setUniform('Matrix4fv','uMI',false,inverse.get());
        // HOMEWORK 1: send all Phong coefficients before drawing each material.
        setUniform('3fv','uAmbient',shape.material.ambient);
        setUniform('3fv','uDiffuse',shape.material.diffuse);
        setUniform('4fv','uSpecular',shape.material.specular);
        setUniform('3fv','uEmission',shape.material.emission||[0,0,0]);
        setUniform('1f','uPattern',shape.pattern);
        gl.bindVertexArray(shape.mesh.vao);gl.drawArrays(gl.TRIANGLES,0,shape.mesh.count);
      }
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }catch(e){error.textContent='Unable to render: '+e.message;console.error(e);}
}
