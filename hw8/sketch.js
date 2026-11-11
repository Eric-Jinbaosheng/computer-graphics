// KINETIC / 01 — no libraries, no external assets.
// Coordinates are in a fixed 1100 × 650 world; CSS scales the canvas.
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const TAU = Math.PI * 2;
// Render at device resolution, while keeping IK coordinates independent of pixels.
let resolution = 1;
function resizeCanvas() {
  resolution = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(1100 * resolution);
  canvas.height = Math.round(650 * resolution);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
const dot = (a,b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];

// The JavaScript gradient-noise function from noise.html (class example).
const noise = (x,y,z) => {
  const normalize = v => { const s = Math.sqrt(dot(v,v)); return v.map(a => a/s); };
  const c = Math.cos, floor = Math.floor;
  const r = (x,y,z) => c(5 * (x + 5 * c(5 * (y + 5 * c(5 * (z + 5 * c(5 * x)))))));
  const s = (x,y,z) => normalize([r(x,y,z),r(y,z,x),r(z,x,y)]);
  const i = floor(x), j = floor(y), k = floor(z), u = x-i, v = y-j, w = z-k;
  const t = (x,y,z) => dot(s(i+x,j+y,k+z),[u-x,v-y,w-z]);
  const e = (f,a,b) => a+(b-a)*(f<.5 ? 2*f*f : 2*f*(2-f)-1);
  return e(w,e(v,e(u,t(0,0,0),t(1,0,0)),e(u,t(0,1,0),t(1,1,0))),
             e(v,e(u,t(0,0,1),t(1,0,1)),e(u,t(0,1,1),t(1,1,1))));
};

// Class two-link IK, with safeguards for zero distance and unreachable targets.
// Returns BOTH the joint and reachable endpoint, preserving segment lengths.
function solveIK(root, target, a, b, bend = 1) {
  const dx = target[0]-root[0], dy = target[1]-root[1];
  const raw = Math.hypot(dx,dy);
  const d = Math.max(Math.abs(a-b)+.0001, Math.min(a+b-.0001,raw));
  const ux = raw > 1e-8 ? dx/raw : 0, uy = raw > 1e-8 ? dy/raw : 1;
  const along = (a*a-b*b+d*d)/(2*d);
  const height = Math.sqrt(Math.max(0,a*a-along*along));
  return { root, joint:[root[0]+ux*along-uy*height*bend,root[1]+uy*along+ux*height*bend],
    end:[root[0]+ux*d,root[1]+uy*d] };
}
const mix = (a,b,t) => a+(b-a)*t;
const smooth = t => { t = Math.max(0,Math.min(1,t)); return t*t*t*(t*(t*6-15)+10); };
const lerp = (a,b,t) => [mix(a[0],b[0],t),mix(a[1],b[1],t)];
const pickup = [420,433], deposit = [710,421];
const rest = [622,419];

// One ten-second cycle: reach, grasp, lift, carry, lower, release, return.
// All keyframes ease to a stop, including the instant of attachment/release.
function choreography(t) {
  const keys = [[0,rest],[2,pickup],[2.6,pickup],[3.6,[452,330]],
    [5.4,[710,330]],[6.5,deposit],[7,deposit],[8.8,rest],[10,rest]];
  let hand = rest;
  for (let i=1;i<keys.length;i++) if(t<=keys[i][0]) {
    hand=lerp(keys[i-1][1],keys[i][1],smooth((t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]))); break;
  }
  return { hand, held:t>=2.3 && t<6.8, released:t>=6.8,
    label:t<2.3?'01 / Approach':t<3.6?'02 / Lift':t<5.4?'03 / Transfer':t<6.8?'04 / Release':'05 / Return' };
}
function pose(time, amount) {
  const t = time%10, action = choreography(t);
  const lean = -22*Math.sin(Math.PI*smooth(Math.min(t/4,1))) + 19*Math.sin(Math.PI*smooth(Math.max(0,(t-4)/5)));
  const x = 556+lean+noise(time*.45,3.1,8.5)*32*amount;
  const y = 428+noise(time*.55,9.2,2.3)*24*amount;
  const shoulder = [x+28,y-96];
  return {t,action,x,y,
    right:solveIK(shoulder,action.hand,108,108,1),
    left:solveIK([x-28,y-96],[x-54,y-8],66,64,1),
    legs:[solveIK([x-23,y],[513,525],64,66,1),solveIK([x+23,y],[597,525],64,66,-1)] };
}
function line(points,color,width) { ctx.beginPath(); points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(); }
function circle(x,y,r,color) { ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=color;ctx.fill(); }
function ellipse(x,y,rx,ry,color) { ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fillStyle=color;ctx.fill(); }
function rect(x,y,w,h,r,color) {ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=color;ctx.fill();}
// Render the mechanism as machined links with dark bearings and pale shells.
function metal(x0,y0,x1,y1) {
  const g=ctx.createLinearGradient(x0,y0,x1,y1);
  g.addColorStop(0,'#899383');g.addColorStop(.22,'#d7ddd0');
  g.addColorStop(.45,'#eef0e6');g.addColorStop(.7,'#c3cbbb');g.addColorStop(1,'#7b8773');
  return g;
}
function bearing(x,y,r) {
  circle(x,y,r+2,'#384232');circle(x,y,r,metal(x-r,y-r,x+r,y+r));
  circle(x,y,r*.57,'#58634e');circle(x,y,r*.34,'#bbc5b0');
  line([[x-r*.16,y],[x+r*.16,y]],'#46523c',1);
  for(let i=0;i<3;i++){const a=i*TAU/3;circle(x+Math.cos(a)*r*.77,y+Math.sin(a)*r*.77,.8,'#536048');}
}
function limb(l,color,width) {
  for(const [a,b] of [[l.root,l.joint],[l.joint,l.end]]) {
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    ctx.save();ctx.translate(...a);ctx.rotate(Math.atan2(b[1]-a[1],b[0]-a[0]));
    // Two exposed rails, a rounded metal casing, and inset panel seams.
    line([[7,-width*.3],[length-6,-width*.3]],'#3c4635',3);
    line([[7,width*.3],[length-6,width*.3]],'#66735b',3);
    rect(length*.16,-width*.55,length*.68,width*1.1,4,metal(0,-width*.55,0,width*.55));
    line([[length*.22,-width*.35],[length*.72,-width*.35]],'#f7f8ef',.8);
    for(const k of [.24,.72])line([[length*k,-width*.42],[length*k,width*.42]],'#839077',.7);
    // Cable stays behind the link and bends with the joint.
    ctx.beginPath();ctx.moveTo(5,width*.6);ctx.bezierCurveTo(length*.3,width*1.1,length*.7,width*1.1,length-5,width*.6);
    ctx.strokeStyle='#555e4c';ctx.lineWidth=1.4;ctx.stroke();
    ctx.restore();
  }
  bearing(...l.root,width*.64);bearing(...l.joint,width*.64);
}
function sphere(x,y,alpha=1) {
  ctx.save();ctx.globalAlpha=alpha;
  const g=ctx.createRadialGradient(x-5,y-6,1,x,y,17);
  g.addColorStop(0,'#f3a276');g.addColorStop(.65,'#e66c3d');g.addColorStop(1,'#b94725');
  circle(x,y,17,g);
  ctx.beginPath();ctx.ellipse(x-4,y-6,5,2.4,-.5,0,TAU);ctx.fillStyle='rgba(255,232,202,.38)';ctx.fill();
  ctx.restore();
}
function label(text,x,y,color='#969b90') {ctx.fillStyle=color;ctx.font='9px monospace';ctx.fillText(text,x,y);}
function background() {
  const studio=ctx.createRadialGradient(490,250,40,550,330,670);
  studio.addColorStop(0,'#fafbf5');studio.addColorStop(1,'#e3e7dc');
  ctx.fillStyle=studio;ctx.fillRect(0,0,1100,650);
  // Enlarged subject and a consistent world transform for feet, props, shadows.
  ctx.save();ctx.translate(550,530);ctx.scale(1.28,1.28);ctx.translate(-550,-530);
  // Restrained drafting marks, generous blank space, and a single floor plane.
  for(let x=50;x<1100;x+=50)for(let y=100;y<550;y+=50)circle(x,y,.45,'#d5dacf');
  line([[60,534],[1040,534]],'#b8bdb2',1);
  for(let x=60;x<=1040;x+=20)line([[x,534],[x, x%100===0?543:538]],'#b8bdb2',1);
  label('GROUND / Y = 0',180,557);label('FOOT CONTACT / LOCKED',760,557);
  label('A / SOURCE',389,557);label('B / RECEIVER',678,557);
  // Both plinths meet the object at their top surface.
  for(const [x,top] of [[420,450],[710,438]]) {
    ellipse(x,531,53,5,'rgba(39,47,38,.07)');
    rect(x-32,top,64,82+(450-top),2,metal(x-32,top,x+70,top+15));
    rect(x+21,top,11,82+(450-top),0,'#b1bba6');
    for(let i=0;i<5;i++)line([[x-22,top+45+i*4],[x+10,top+45+i*4]],'#b0baa4',.6);
    rect(x-35,top-2,70,4,1,'#7a886c');
    ellipse(x,top,22,2,'#c3cbb9');
    line([[x-32,top],[x+32,top]],'#9da695',2);
    label(x===420?'A':'B',x-22,top+25,'#858e7c');
  }
}
function draw(time,amount,debug) {
  ctx.setTransform(resolution,0,0,resolution,0,0);
  background();
  const p=pose(time,amount), {x,y,action}=p;
  for(let i=6;i>0;i--)ellipse(555,532,60+i*6,2+i,'rgba(40,50,30,.018)');
  limb(p.left,'#a3ada0',10);
  p.legs.forEach(l=>limb(l,'#c2c8bb',16));
  for(const fx of [513,597]) {rect(fx-16,518,36,14,3,'#363e34');line([[fx-12,519],[fx+15,519]],'#e0e3d9',3);}
  // Exposed spine and a tapered rib shell, instead of a rounded cartoon body.
  line([[x,y-2],[x,y-102]],'#3d473b',16);
  for(let i=0;i<5;i++)rect(x-12,y-25-i*12,24,4,1,'#929d8a');
  ctx.beginPath();ctx.moveTo(x-31,y-106);ctx.lineTo(x+32,y-106);ctx.lineTo(x+23,y-65);ctx.lineTo(x+9,y-54);ctx.lineTo(x-18,y-62);ctx.closePath();ctx.fillStyle=metal(x-31,y-100,x+35,y-60);ctx.fill();
  line([[x-24,y-99],[x+23,y-99]],'#fafaf5',2);
  rect(x-28,y-8,56,19,4,'#9aa68f');
  label('K—01',x-16,y-79,'#5b6751');
  circle(x+17,y-91,3,'#e16a3e');
  for(let i=0;i<3;i++)line([[x-13,y-73+i*3],[x+8,y-73+i*3]],'#8c997e',1);
  for(const v of [[x-24,y-99],[x+25,y-99],[x+15,y-65]])circle(...v,1.5,'#67775b');
  // Shoulder crossbar ties both arm roots into the torso.
  line([[x-27,y-96],[x+27,y-96]],'rgba(91,108,76,.35)',2);
  line([[x,y-107],[x,y-124]],'#404a39',9);
  ctx.save();ctx.translate(x,y-141);ctx.rotate(noise(time*.4,4.1,6.4)*.7*amount+(action.hand[0]-x)*.0005);
  rect(-22,-17,44,34,7,metal(-22,-17,22,17));rect(-21,-6,43,10,2,'#303a2b');
  const gaze=(action.hand[0]-x)*.035;
  rect(gaze-5,-4,10,3,1,'#e47b4d');line([[-15,-14],[14,-14]],'#fdfdf7',2);
  bearing(-23,1,5);
  ctx.restore();
  limb(p.right,'#d0d5c8',13);
  // Object attachment uses the solved wrist position, not an independent path.
  if(action.held)sphere(...p.right.end);
  else if(!action.released)sphere(...pickup);
  else sphere(...deposit,1-smooth((p.t-9)/1));
  if(action.released)sphere(...pickup,smooth((p.t-8.3)/1.7));
  const wrist=p.right.end;
  // Fingers close and open smoothly during the contact pauses.
  const closure=smooth((p.t-2)/.3)*(1-smooth((p.t-6.8)/.2));
  const grip=mix(25,16,closure);
  line([[wrist[0]-9,wrist[1]-21],[wrist[0]+9,wrist[1]-21]],'#4d5942',5);
  for(const side of [-1,1]) {
    line([[wrist[0]+side*8,wrist[1]-21],[wrist[0]+side*grip,wrist[1]-12],[wrist[0]+side*grip,wrist[1]+1]],'#46543c',3);
    line([[wrist[0]+side*grip,wrist[1]-6],[wrist[0]+side*grip,wrist[1]+1]],'#9eaa91',4);
    circle(wrist[0]+side*8,wrist[1]-21,2,'#aab69c');
  }
  circle(...p.left.end,7,'#4d5845');
  if(debug) {
    for(const l of [...p.legs,p.left,p.right]) {line([l.root,l.joint,l.end],'#e5683f',1);for(const v of [l.root,l.joint,l.end])circle(...v,3,'#e5683f');}
    for(const v of [action.hand,[513,525],[597,525]]) {line([[v[0]-9,v[1]],[v[0]+9,v[1]]],'#d75d35',1);line([[v[0],v[1]-9],[v[0],v[1]+9]],'#d75d35',1);}
  }
  ctx.restore();
  // Quiet timing track makes the effect of the tempo control directly visible.
  label('CYCLE / 10 s',60,616);
  line([[190,613],[1040,613]],'#d3d7cc',2);
  line([[190,613],[190+850*p.t/10,613]],'#676f5e',2);
  circle(190+850*p.t/10,613,3,'#dc6d43');
  document.getElementById('phase').textContent=action.label;
  document.getElementById('scrub').value=p.t;
  document.getElementById('timeValue').value=p.t.toFixed(2)+' / 10 s';
}
let elapsed=0,previous=null,paused=false;
const pauseButton=document.getElementById('pause');
pauseButton.onclick=()=>{paused=!paused;pauseButton.textContent=paused?'继续':'暂停';pauseButton.setAttribute('aria-pressed',String(paused));};
document.getElementById('restart').onclick=()=>{elapsed=0;draw(elapsed,+document.getElementById('organic').value,document.getElementById('skeleton').checked);};
document.getElementById('organic').oninput=e=>document.getElementById('organicValue').value=Math.round(Number(e.target.value)*100)+'%';
document.getElementById('speed').oninput=e=>document.getElementById('speedValue').value=Number(e.target.value).toFixed(1)+'×';
if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){paused=true;pauseButton.textContent='继续';}
document.getElementById('scrub').oninput=e=>{
  elapsed=Number(e.target.value);paused=true;pauseButton.textContent='继续';
  pauseButton.setAttribute('aria-pressed','true');
  draw(elapsed,Number(document.getElementById('organic').value),document.getElementById('skeleton').checked);
};
window.addEventListener('keydown',e=>{
  if(e.code==='Space'&&!['INPUT','BUTTON','TEXTAREA','SELECT'].includes(e.target.tagName)){
    e.preventDefault();pauseButton.onclick();
  }
});
function frame(now) {
  if(previous!==null&&!paused)elapsed+=Math.min((now-previous)/1000,.05)*Number(document.getElementById('speed').value);
  previous=now;
  draw(elapsed,Number(document.getElementById('organic').value),document.getElementById('skeleton').checked);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
