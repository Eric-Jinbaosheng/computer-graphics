const $=id=>document.getElementById(id);
let mode='chill',paused=false,phase=0,last=performance.now();
const descriptions={chill:'Easy shoulder rolls, relaxed arms, and a gentle head bob.',energetic:'Big arm swings, bouncy knees, and a confident head tilt.',shy:'Small steps, tucked-in elbows, and a bashful downward glance.'};
const targets={chill:[1,.45,.10],energetic:[1.65,1,.32],shy:[.7,.22,-.20]};
let pose=[...targets.chill];
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('personality').textContent=descriptions[mode];});
function updateLabels(){for(const id of ['speed','energy','sway','angle'])$(id+'Out').value=id==='speed'?(+$('speed').value).toFixed(1)+'×':$(id).value+(id==='angle'?'°':'%');}
for(const id of ['speed','energy','sway','angle'])$(id).oninput=updateLabels;
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';$('pause').setAttribute('aria-pressed',String(paused));};
$('reset').onclick=()=>{phase=0;paused=false;pose=[...targets.chill];document.querySelector('[data-mode="chill"]').click();for(const [id,v] of Object.entries({speed:1,energy:70,sway:60,angle:20}))$(id).value=v;$('pause').textContent='Pause';$('pause').setAttribute('aria-pressed','false');updateLabels();};
function Scene(){
   this.vertexSize = 8;
   this.vertexAttributes = {
      aPos: { size: 3, position: 0 },
      aNor: { size: 3, position: 3 },
      aUV:  { size: 2, position: 6 },
   };

   this.vertexShader = `#version 300 es
   in  vec3 aPos, aNor;
   in  vec2 aUV;
   out vec3 vPos, vNor;
   out vec2 vUV;
   uniform mat4 uMF, uMI;
   void main() {
      vec4 pos = uMF * vec4(aPos, 1.);
      vec4 nor = vec4(aNor, 0.) * uMI;
      vPos = pos.xyz / pos.w;
      vPos.z *= -1.;
      vNor = nor.xyz;
      vUV = aUV;
      gl_Position = vec4(vPos, 1.);
   }`;

   this.fragmentShader = `#version 300 es
   precision highp float;

   in  vec3 vPos, vNor;
   in  vec2 vUV;
   out vec4 fragColor;
   uniform vec3 uAmbient, uDiffuse;
   uniform vec4 uSpecular;

   vec3 La = normalize(vec3(-.7,.7,1.));                     // LIGHT SOURCE DIRECTIONS
   vec3 Lb = normalize(vec3(.7,.3,.7));

   vec3 W = vec3(0.,0.,-1.);                // DIRECTION FROM CAMERA INTO THE SCREEN

   void main() {
      vec3 N = normalize(vNor);             // PHONG SHADING FROM TWO LIGHT SOURCES
      vec3 R = 2. * dot(W,N) * N - W;
      vec3 color = uAmbient
         + uDiffuse * max(0.,dot(N,La)) + uSpecular.rgb * pow(max(0.,dot(R,La)), uSpecular.a)
         + uDiffuse * max(0.,dot(N,Lb)) + uSpecular.rgb * pow(max(0.,dot(R,Lb)), uSpecular.a);
      fragColor = vec4(sqrt(color),1.);
   }`;

const material=(c)=>({ambient:c.map(x=>x*.20),diffuse:c.map(x=>x*.65),specular:[.22,.22,.25,45]});
const shell=material([.56,.76,.78]),joint=material([.12,.15,.23]),lime=material([.68,.95,.30]),face=material([.025,.04,.08]),stage=material([.15,.18,.26]),white=material([.8,.88,1]);
const sphere=Shape.sphere(24,16),cube=Shape.cube(),cylinder=Shape.cylinder(64),m=new Matrix();
// Isolate geometry scale from the joint coordinate frame, so children do not stretch.
function part(mesh,mat,x,y,z,sx,sy,sz){m.push();m.move(x,y,z);m.scale(sx,sy,sz);draw(mesh,mat,m);m.pop();}
this.update=()=>{
 const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;
 if(!paused){for(let i=0;i<3;i++)pose[i]+=(targets[mode][i]-pose[i])*(1-Math.exp(-dt*5));phase+=dt*3*pose[0]*(+$('speed').value);}
 const t=phase,e=+$('energy').value/100,a=e*pose[1],sway=+$('sway').value/100;
 gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 m.identity();m.perspective(8);m.turnX(.10);m.turnY(+$('angle').value*Math.PI/180);
 // Stage is a sibling of the animated root, not a child of the torso.
 m.push();m.move(0,-.73,0);m.turnX(Math.PI/2);part(cylinder,stage,0,0,0,.69,.69,.045);part(cylinder,lime,0,0,-.045,.70,.70,.009);m.pop();
 for(let i=0;i<12;i++){m.push();m.turnY(i*Math.PI/6);part(cube,white,0,-.676,.61,.035,.004,.008);m.pop();}
 // Root → pelvis. Both the upper body and the leg chains inherit its motion.
 m.push();m.move(.045*sway*a*Math.sin(t),.015+.025*a*Math.cos(2*t),0);m.turnZ(.09*sway*a*Math.sin(t));
 part(sphere,joint,0,-.10,0,.17,.115,.12);part(sphere,lime,0,-.09,.105,.085,.035,.025);
 // Pelvis → torso → neck/head and shoulder chains.
 m.push();m.move(0,.04,0);m.turnY(.10*a*Math.sin(t));m.turnZ(-.07*a*Math.sin(t));
 part(sphere,shell,0,.13,0,.22,.26,.135);part(sphere,face,0,.16,.13,.10,.085,.022);part(sphere,lime,0,.16,.151,.035,.035,.01);
 m.push();m.move(0,.39,0);m.turnZ(.10*a*Math.sin(t-.6));m.turnX(.10*a*Math.sin(2*t-.5)-pose[2]*.4);part(cylinder,joint,0,0,0,.06,.06,.06);
 part(sphere,shell,0,.13,0,.17,.15,.14);part(sphere,face,0,.13,.117,.145,.09,.04);
 const blink=(t%11)>10.6?.10:1;
 for(const side of [-1,1])part(sphere,lime,side*.059,.14,.153,.024,.027*blink,.009);
 part(cube,lime,0,.085,.155,.035,.005,.006);part(sphere,joint,0,.29,0,.012,.05,.012);part(sphere,lime,0,.34,0,.025,.025,.025);m.pop();
 for(const side of [-1,1]){
  m.push();m.move(side*.23,.27,0);m.turnZ(side*(.12+pose[2]+a*.18*Math.sin(t+side)));m.turnX(a*.85*Math.sin(t+side*Math.PI/2));
  part(sphere,joint,0,0,0,.065,.065,.065);part(sphere,shell,0,-.13,0,.065,.13,.065);
  // Shoulder → elbow → wrist. Elbow bends in the inherited upper-arm frame.
  m.move(0,-.26,0);m.turnX(-.4-a*.65*(.5+.5*Math.sin(t+side*Math.PI/2-.5)));
  part(sphere,lime,0,0,0,.058,.058,.058);part(sphere,shell,0,-.12,0,.055,.12,.055);
  m.move(0,-.245,0);m.turnZ(.15*a*Math.sin(t-.8));part(sphere,joint,0,-.015,0,.065,.075,.06);m.pop();
 }
 m.pop();
 for(const side of [-1,1]){
  const step=Math.sin(t+side*Math.PI/2);
  m.push();m.move(side*.105,-.17,0);m.turnX(a*.35*step);m.turnZ(side*.055);
  part(sphere,joint,0,0,0,.06,.06,.06);part(sphere,shell,0,-.105,0,.075,.11,.075);
  // Hip → knee → ankle; toe inherits both hip and knee rotations.
  m.move(0,-.22,0);m.turnX(.12+a*.48*Math.max(0,-step));part(sphere,lime,0,0,0,.058,.058,.058);part(sphere,shell,0,-.105,0,.060,.105,.060);
  m.move(0,-.21,0);m.turnX(-.10-a*.12*Math.max(0,-step));part(sphere,joint,0,-.035,.045,.085,.055,.13);m.pop();
 }
 m.pop();
};}
try{if(!$('canvas').getContext('webgl2'))throw Error('WebGL 2 is unavailable. Please try a browser with hardware acceleration enabled.');gl_start($('canvas'),new Scene());}catch(e){$('error').textContent=e.message;}
