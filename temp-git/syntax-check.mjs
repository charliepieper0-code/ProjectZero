
import * as THREE from "three";

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090b0b);
scene.fog = new THREE.FogExp2(0x090b0b,0.027);
const camera = new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.08,100);
const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.22;
renderer.outputColorSpace=THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
camera.rotation.order="YXZ";
scene.add(camera);

const clock=new THREE.Clock();
const raycaster=new THREE.Raycaster();
const keys={};
let world=new THREE.Group(),levelIndex=0,state="menu",quality="medium";
let player=new THREE.Vector3(0,0,8.8),yaw=0,pitch=0,playerHeight=1.7,velocityY=0,onGround=true;
let health=100,ammo=12,reserve=48,keysFound=0,lastShot=0,lastDamage=0,reloading=false;
let collectibles=[],enemies=[],collisionBoxes=[],lights=[],portal=null,weapon=null;
let mouseFiring = false;
let nextLightUpdate = 0;
let noticeTimeout=null,mouseSensitivity=.002;
let cinematicGroup=null,cinematicRain=null,cinematicStarted=0,cinematicStep=-1,cinematicSteps=[],cinematicTimer=null,cinematicSectorIndex=0;
let scareUsed=false,nextAmbientEvent=0,screenShake=0;
let audioCtx=null,masterGain=null,ambientNodes=null,flashlightOn=false,flashlight=null,flashTarget=null,flashFill=null,flashBeam=null,footstepTimer=0,lastGrowl=0;
const levels=[
 {name:"THE ARRIVAL",tag:"ENTRY & SECURITY",exit:[8.8,-8.8],keys:[[-8,-8],[0,-8],[8,1],[-7,7],[1,5]],walls:[[-4,-2,1,7],[2,3,1,7],[7,-5,1,4]],enemies:[[-8,2],[5,-8]],scare:null,seed:2},
 {name:"RESTRICTED SECTOR",tag:"LOWER RESEARCH WING",exit:[8.7,-8.7],keys:[[-8,-8],[-1,-8],[8,-5],[-8,6],[1,7],[8,5]],walls:[[-6,-4,1,10],[0,2,1,10],[6,-4,1,10],[-2,-9,7,.8],[3,8,8,.8]],enemies:[[-9,8],[3,-8],[9,2]],scare:null,seed:4},
 {name:"THE EXPERIMENT",tag:"CONTAINMENT & TESTING",exit:[8.8,8.8],keys:[[-8,-8],[-5,1],[0,-8],[5,0],[9,-8],[-1,8],[7,7]],walls:[[-7,-3,1,9],[-2,-7,1,7],[3,3,1,9],[8,-3,1,9],[-1,6,7,.8]],enemies:[[-9,8],[0,-9],[9,-9],[0,3]],scare:[5,5],seed:7},
 {name:"POWER STATION",tag:"GENERATOR & COOLANT",exit:[8.7,-8.7],keys:[[-9,-8],[-4,-8],[1,-8],[8,-4],[-8,4],[-1,7],[7,7]],walls:[[-7,0,1,10],[-2,-5,1,8],[3,3,1,10],[8,-5,1,7],[-2,8,8,.8]],enemies:[[-9,8],[-4,-8],[4,-8],[9,4],[0,2]],scare:null,seed:9},
 {name:"MEDICAL WARD",tag:"TRIAGE & BIOHAZARD",exit:[-8.7,8.7],keys:[[-9,-8],[-3,-8],[4,-8],[9,-3],[-8,1],[0,1],[8,7],[-1,8]],walls:[[-7,-3,1,8],[-3,2,1,8],[1,-4,1,8],[5,3,1,9],[9,-7,1,6]],enemies:[[-9,8],[-5,-8],[0,-8],[8,-8],[8,5],[-1,6]],scare:null,seed:12},
 {name:"CORE CHAMBER",tag:"PRIMARY CONTAINMENT // SECTOR II",exit:[8.7,8.7],keys:[[-9,-9],[-4,-9],[1,-9],[8,-8],[-9,0],[-3,4],[3,1],[8,4],[0,9]],walls:[[-7,-4,1,10],[-3,3,1,9],[1,-5,1,9],[5,3,1,9],[9,-4,1,10],[-1,8,8,.8]],enemies:[[-9,8],[-8,-8],[-2,-8],[4,-8],[9,-1],[5,8],[-1,5],[0,0]],scare:[0,-1],seed:16},
 {name:"FLOODED ARCHIVE",tag:"SECTOR III // SUBLEVEL 07 // NIGHTMARE",exit:[-8.7,-8.7],keys:[[-9,-8],[-4,-7],[1,-8],[8,-7],[-8,0],[-2,2],[5,1],[9,7],[-1,9]],walls:[[-7,-3,1,8],[-3,2,1,8],[1,-4,1,8],[5,3,1,8],[9,-6,1,7],[-1,7,8,.8]],enemies:[[-9,8],[-8,-8],[-3,-8],[3,-8],[9,-1],[8,8],[0,4],[-1,-1]],scare:null,seed:19},
 {name:"THE FURNACE",tag:"SECTOR III // SUBLEVEL 08 // CRITICAL",exit:[8.7,-8.7],keys:[[-9,-9],[-5,-8],[0,-9],[6,-8],[9,-2],[-8,2],[-2,4],[4,3],[8,8],[0,9]],walls:[[-7,-4,1,10],[-3,3,1,9],[1,-5,1,9],[5,3,1,9],[9,-4,1,10],[-1,8,8,.8],[0,-1,7,.8]],enemies:[[-9,8],[-8,-8],[-4,-8],[0,-8],[5,-8],[9,0],[5,8],[-1,5],[0,0]],scare:null,seed:22},
 {name:"THE HEART",tag:"SECTOR III // SUBLEVEL 09 // FINAL CONTAINMENT",exit:[0,-9],keys:[[-9,-9],[-5,-9],[5,-9],[9,-9],[-9,-2],[9,-2],[-6,6],[6,6],[0,8]],walls:[[-7,-3,1,10],[-3,2,1,8],[3,2,1,8],[7,-3,1,10],[-1,-6,8,.8],[-1,7,8,.8]],enemies:[[-9,8],[-8,-8],[-5,-5],[5,-5],[9,8],[-5,5],[5,5],[0,0],[0,-2]],scare:[0,1],seed:27}
];

// Procedural sound design: no external audio downloads required. Audio starts after the first user interaction.
function initAudio(){
 if(audioCtx){if(audioCtx.state==="suspended")audioCtx.resume();return;}
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 audioCtx=new AC();masterGain=audioCtx.createGain();masterGain.gain.value=.48;masterGain.connect(audioCtx.destination);
 const drone=audioCtx.createOscillator(),droneGain=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();
 drone.type="sawtooth";drone.frequency.value=42;filter.type="lowpass";filter.frequency.value=105;droneGain.gain.value=.035;
 drone.connect(filter);filter.connect(droneGain);droneGain.connect(masterGain);drone.start();
 const hum=audioCtx.createOscillator(),humGain=audioCtx.createGain();hum.type="sine";hum.frequency.value=58;humGain.gain.value=.018;hum.connect(humGain);humGain.connect(masterGain);hum.start();
 ambientNodes={drone,droneGain,hum,humGain};
}
function tone(freq,duration,type="sine",volume=.12,slide=0){
 if(!audioCtx)return;const now=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(25,freq+slide),now+duration);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);g.connect(masterGain);o.start(now);o.stop(now+duration+.03);
}
function noiseBurst(duration=.16,volume=.16,lowpass=2400){
 if(!audioCtx)return;const n=Math.floor(audioCtx.sampleRate*duration),buffer=audioCtx.createBuffer(1,n,audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);
 const src=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),g=audioCtx.createGain();src.buffer=buffer;filter.type="lowpass";filter.frequency.value=lowpass;g.gain.value=volume;src.connect(filter);filter.connect(g);g.connect(masterGain);src.start();
}
function sfx(name){
 if(!audioCtx)return;
 if(name==="shot"){noiseBurst(.22,.34,3200);tone(105,.12,"sawtooth",.2,-65);tone(780,.045,"square",.045,-500);}
 if(name==="reload"){tone(520,.055,"square",.07,-250);setTimeout(()=>tone(260,.08,"square",.08,-90),360);setTimeout(()=>noiseBurst(.1,.1,900),720);}
 if(name==="pickup"){tone(520,.12,"sine",.11,220);setTimeout(()=>tone(790,.18,"sine",.09,140),90);}
 if(name==="hit"){noiseBurst(.12,.18,650);tone(75,.2,"sawtooth",.12,-35);}
 if(name==="enemyDown"){tone(120,.32,"triangle",.15,-85);noiseBurst(.24,.12,500);}
 if(name==="growl"){tone(62,.55,"sawtooth",.055,-28);noiseBurst(.32,.045,380);}
 if(name==="step"){noiseBurst(.065,.035,420);tone(65,.045,"sine",.025,-15);}
 if(name==="door"){tone(90,.7,"sawtooth",.13,-45);setTimeout(()=>noiseBurst(.35,.12,700),180);}
}

function material(color,roughness=.8,metalness=.1,extra={}){return new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});}
const concrete=material(0x343633,.95);
const darkMetal=material(0x171b1b,.55,.72);
const rust=material(0x50332b,.85,.35);
const grime=material(0x242827,1);
const hazard=material(0x9b713c,.7,.25);
const keyMat=material(0xc5a66b,.25,.85,{emissive:0x4c260b,emissiveIntensity:.6});

function addBox(parent,w,h,d,x,y,z,mat,shadow=true){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;
}
function addLight(parent,color,intensity,distance,x,y,z){
 const l=new THREE.PointLight(color,intensity,distance,2);
 l.position.set(x,y,z);parent.add(l);lights.push({light:l,base:intensity,phase:Math.random()*8});return l;
}

function disposeOldWorld(){
    if(!world) return;

    scene.remove(world);

    world.traverse(object=>{
        if(!object.isMesh) return;

        if(object.geometry){
            object.geometry.dispose();
        }

   
// Only dispose materials created specifically for this level.
if(object.material){
    const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

    materials.forEach(m=>{
        if(m.userData.levelOwnedMaterial){
            m.dispose();
        }
    });
}
    });
    world.clear();
}

function buildRoom(data){
 disposeOldWorld();world=new THREE.Group();collisionBoxes=[];collectibles=[];enemies=[];lights=[];
 const floor=addBox(world,24,.45,24,0,-.25,0,concrete);
 addBox(world,24,.4,24,0,4.25,0,grime);
 // Perimeter walls, with layered metal skirting and ceiling beams.
 addBox(world,24,4,.45,0,1.8,-12,concrete);
 addBox(world,24,4,.45,0,1.8,12,concrete);
 addBox(world,.45,4,24,-12,1.8,0,concrete);
 addBox(world,.45,4,24,12,1.8,0,concrete);
 addBox(world,24,.22,.55,0,.18,-11.7,darkMetal);
 addBox(world,24,.22,.55,0,.18,11.7,darkMetal);
 addBox(world,.55,.22,24,-11.7,.18,0,darkMetal);
 addBox(world,.55,.22,24,11.7,.18,0,darkMetal);
 collisionBoxes.push({x:-12,z:-12,w:24,d:.6},{x:-12,z:11.4,w:24,d:.6},{x:-12,z:-12,w:.6,d:24},{x:11.4,z:-12,w:.6,d:24});
 data.walls.forEach(([x,z,w,d])=>{
  addBox(world,w,3.7,d,x,1.8,z,concrete);
  addBox(world,w+.08,.16,d+.08,x,3.72,z,darkMetal);
  addBox(world,w,.16,d,x,.22,z,darkMetal);
  collisionBoxes.push({x:x-w/2,z:z-d/2,w,d});
 });
 // Industrial pipework, floor markings, grates and ceiling fixtures.
 for(let i=0;i<5;i++){
  const z=-9+i*4.5;
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,23,10),darkMetal);
  pipe.rotation.z=Math.PI/2;pipe.position.set(0,3.55,z);world.add(pipe);
 }
 for(let i=0;i<6;i++){
  const x=-9+i*3.6;
  addBox(world,.055,.012,20,x,.012,0,hazard,false);
 }
 // Ventilation panels and wall-mounted industrial fixtures.
 for(let side of [-1,1]){
  for(let i=0;i<5;i++){
   const z=-9+i*4.5;
   const x=side*11.68;
   addBox(world,.08,1.05,1.6,x,2.7,z,darkMetal);
   for(let k=0;k<5;k++)addBox(world,.09,.035,1.42,x+side*.05,2.25+k*.18,z,grime,false);
  }
 }
 // Distinct light pools, with warm emergency lamps and sickly overhead fluorescents.
 for(let i=0;i<6;i++){
  const x=-9+i*3.6;
  const fixture=addBox(world,1.5,.12,.35,x,3.92,-2, darkMetal);
const tubeMat = material(0xb9b8a4,.35,.1,{
    emissive:0x77745f,
    emissiveIntensity:.8
});
tubeMat.userData.levelOwnedMaterial = true;

const tube = new THREE.Mesh(
    new THREE.BoxGeometry(1.25,.045,.12),
    tubeMat
);
tube.position.set(x,3.83,-2);
world.add(tube);

addLight(world,0xb2b7a4,quality==="low"?7:13,10,x,3.5,-2);

 }
 for(let i=0;i<4;i++){
  const z=-8+i*5.2;
  addBox(world,.12,.7,.12,11.5,2.8,z,rust);
  addLight(world,0xb13b25,quality==="ultra"?8:5,6,11.15,2.8,z);
 }
 // Random debris and crates, positioned away from key paths.
 const crateSpots=[[-9,0],[9,8],[-9,-4],[4,9]];
 crateSpots.forEach(([x,z],i)=>{
  addBox(world,.9,.8,.9,x,.4,z,i%2?darkMetal:rust);
  addBox(world,.94,.08,.94,x,.84,z,grime);
  addBox(world,.12,.84,.94,x-.3,.4,z,hazard,false);
 });
 // Wall-mounted warning plates.
 const signMat=material(0x5d2923,.7,.2,{emissive:0x230806});
signMat.userData.levelOwnedMaterial = true;
 for(let i=0;i<3;i++){
  const z=-7+i*7;
  addBox(world,.04,.65,1.6,-11.7,2.6,z,signMat,false);
  addBox(world,.045,.08,1.25,-11.65,2.78,z,hazard,false);
 }
 // Access keys: brass data cylinders, not floating arcade coins.
 data.keys.forEach(([x,z],i)=>{
  const g=new THREE.Group();
  const core=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.48,12),keyMat);
  core.rotation.z=Math.PI/2;g.add(core);
  const a=new THREE.Mesh(new THREE.TorusGeometry(.24,.035,8,20),material(0xb98b4d,.25,.8,{emissive:0x3c1e08}));
  a.rotation.y=Math.PI/2;g.add(a);
  const b=a.clone();b.rotation.y=0;g.add(b);
  g.position.set(x,.9,z);world.add(g);collectibles.push({mesh:g,taken:false,phase:i});
 });
 // Heavy exit bulkhead and circular locking mechanism, present on every level.
 portal=new THREE.Group();
 addBox(portal,2.9,3.8,.55,0,1.9,0,darkMetal);
 addBox(portal,2.45,3.35,.18,0,1.9,-.34,rust);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.12,.105,16,48),material(0x76654b,.3,.8,{emissive:0x24170a,emissiveIntensity:.3}));
 ring.position.set(0,1.9,-.46);portal.add(ring);
 const inner=new THREE.Mesh(new THREE.CircleGeometry(.94,48),material(0x151b19,.4,.5,{emissive:0x090f0d}));
 inner.position.set(0,1.9,-.455);portal.add(inner);
 for(let i=0;i<4;i++){
  const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.09,10),hazard);
  bolt.rotation.x=Math.PI/2;
  const a=i*Math.PI/2;bolt.position.set(Math.cos(a)*1.25,1.9+Math.sin(a)*1.25,-.48);portal.add(bolt);
 }
 portal.position.set(data.exit[0],0,data.exit[1]);world.add(portal);
 addLight(portal,0x9b442d,quality==="ultra"?12:6,7,0,2.2,.2);
 // Enemy placements.
 data.enemies.forEach(([x,z],i)=>createStalker(x,z,i));
 // A little local dressing gives each level a different identity.
 if(levelIndex===1){
  for(let i=0;i<3;i++){const x=-7+i*7;addBox(world,1.2,1.1,1.2,x,.55,0,darkMetal);addBox(world,1.25,.08,1.25,x,1.12,0,rust);}
 }
 if(levelIndex===2){
  for(let i=0;i<4;i++){const x=-8+i*5.3;addBox(world,.15,3.3,.15,x,1.65,-2,rust);addBox(world,.15,3.3,.15,x,1.65,2,rust);addBox(world,1.6,.12,4.2,x,3.3,0,darkMetal);}
 }
 scene.add(world);
}
function createStalker(x,z,index){
 const group=new THREE.Group();
 const skin=material(0x292b28,.95,.05);
 const wet=material(0x171918,.35,.3);
 const bone=material(0x77766b,.8,.05);
 // Lean, hunched silhouette with elongated limbs and an irregular head.
 const torso=addBox(group,.62,1.05,.38,0,1.05,0,skin);
 torso.rotation.x=-.18;
 const head=new THREE.Mesh(new THREE.SphereGeometry(.28,12,10),skin);head.position.set(0,1.72,-.08);head.scale.set(.85,1.2,.8);group.add(head);
 const jaw=addBox(group,.28,.18,.25,0,1.52,-.2,bone);jaw.rotation.x=-.25;
 for(let s of [-1,1]){
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.045,8,8),material(0xb34a35,.2,.1,{emissive:0x7a170d,emissiveIntensity:1.4}));
  eye.position.set(s*.105,1.77,-.315);group.add(eye);
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(.075,.12,.9,8),skin);
  arm.position.set(s*.43,.93,-.03);arm.rotation.z=s*.32;group.add(arm);
  const hand=new THREE.Mesh(new THREE.SphereGeometry(.13,8,8),wet);hand.position.set(s*.55,.48,-.1);group.add(hand);
  const leg=new THREE.Mesh(new THREE.CylinderGeometry(.09,.13,.78,8),skin);
  leg.position.set(s*.19,.35,.03);group.add(leg);
 }
 const spine=new THREE.Mesh(new THREE.ConeGeometry(.12,.65,7),bone);spine.position.set(0,1.2,.25);spine.rotation.x=-.35;group.add(spine);
 group.position.set(x,0,z);world.add(group);
 const boss=levelIndex===8&&index===levels[levelIndex].enemies.length-1;
 const variant=index%3; // standard, fast crawler, heavy brute
 if(variant===1)group.scale.setScalar(.82);
 if(variant===2)group.scale.setScalar(1.2+levelIndex*.025);
 enemies.push({mesh:group,hp:(boss?320:100+levelIndex*22+(variant===2?55:0)),alive:true,speed:1.15+levelIndex*.19+index*.08+(variant===1?.38:variant===2?-.18:0),damage:14+levelIndex*2+(variant===2?5:0),phase:Math.random()*8,attack:0,hit:0,boss,variant});
 if(boss){const crown=new THREE.Mesh(new THREE.TorusGeometry(.34,.065,8,20),material(0x8d3328,.25,.4,{emissive:0x75130b,emissiveIntensity:1.8}));crown.position.set(0,2.05,0);group.add(crown);}
}
function canMove(x,z){
 if(x<-11.25||x>11.25||z<-11.25||z>11.25)return false;
 const r=.34;
 return !collisionBoxes.some(b=>{
  const nx=Math.max(b.x,Math.min(x,b.x+b.w)),nz=Math.max(b.z,Math.min(z,b.z+b.d));
  return (x-nx)**2+(z-nz)**2<r*r;
 });
}
function updateHUD(){
 $("level-number").textContent=String(levelIndex+1).padStart(2,"0");
 const sectorName=levelIndex<3?"SECTOR I // ENTRY & SECURITY":levelIndex<6?"SECTOR II // LOWER FACILITY":"SECTOR III // DEEP CONTAINMENT";
 $("sector").textContent=sectorName+" · "+levels[levelIndex].name;
 $("key-count").textContent=keysFound;
 $("key-total").textContent=collectibles.length;
 $("hostile-count").textContent=enemies.filter(e=>e.alive).length;
 $("health-fill").style.width=health+"%";
 $("health-number").innerHTML=health+' <small style="font-size:10px;color:#999">/ 100</small>';
 $("ammo-count").textContent=ammo;$("reserve-count").textContent=reserve;
 $("objective").textContent=keysFound===collectibles.length?"OBJECTIVE: EXIT ACCESS RESTORED":"OBJECTIVE: RECOVER ACCESS KEYS";
}
function showNotice(text){
 const n=$("notice");n.textContent=text;n.style.opacity="1";
 clearTimeout(noticeTimeout);noticeTimeout=setTimeout(()=>n.style.opacity="0",1700);
}
function setOverlay(title,subtitle,description,button,action){
 state=title==="PAUSED"?"paused":title==="CONTAINMENT BREACH"?"dead":title==="SECTOR CLEARED"||title==="FACILITY ESCAPED"?"complete":"menu";
 $("title").innerHTML=title==="PROJECT ZERO"?'PROJECT <span>ZERO</span>':title;
 $("subtitle").textContent=subtitle;$("description").textContent=description;
 $("playButton").textContent=button;$("playButton").disabled=false;
 $("playButton").onclick=action;
 $("overlay").classList.remove("hidden");$("hud").style.display="none";
 $("interact").textContent="";
}


function showGame(){
    state = "playing";

    $("overlay").classList.add("hidden");
    $("hud").style.display = "block";

    $("playButton").onclick = startGame;

    updateHUD();

    renderer.domElement.focus();

    try {
        renderer.domElement.requestPointerLock();
    } catch(error) {
        console.error("Pointer lock failed:", error);
    }
}


 
renderer.domElement.addEventListener("click",()=>{
 if(state === "playing" &&
    document.pointerLockElement !== renderer.domElement){
  renderer.domElement.requestPointerLock();
 }
});

function makeExterior(){
 if(cinematicGroup)scene.remove(cinematicGroup);
 world.visible=false;
 cinematicGroup=new THREE.Group();
 const concreteExt=material(0x252927,.96,.08),metalExt=material(0x111515,.5,.72),signExt=material(0x191c1a,.55,.55,{emissive:0x190806}),glassExt=material(0x111b1b,.22,.55,{emissive:0x101b1c,emissiveIntensity:.35});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),material(0x111514,1,.05));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;cinematicGroup.add(ground);
 const building=new THREE.Mesh(new THREE.BoxGeometry(26,13,13),concreteExt);building.position.set(0,6.5,-7);building.castShadow=true;building.receiveShadow=true;cinematicGroup.add(building);
 // Industrial facade, inset entrance, windows, warning signage and roof machinery.
 const facade=new THREE.Mesh(new THREE.BoxGeometry(10,7,.45),metalExt);facade.position.set(0,4.2,-.28);cinematicGroup.add(facade);
 const doorL=new THREE.Mesh(new THREE.BoxGeometry(2.35,5.4,.35),material(0x343936,.55,.65));doorL.position.set(-2.38,2.7,-.52);cinematicGroup.add(doorL);
 const doorR=doorL.clone();doorR.position.x=2.38;cinematicGroup.add(doorR);
 const lintel=new THREE.Mesh(new THREE.BoxGeometry(5.2,.45,.55),metalExt);lintel.position.set(0,5.55,-.5);cinematicGroup.add(lintel);
 for(let side of [-1,1])for(let row=0;row<3;row++){
  const win=new THREE.Mesh(new THREE.BoxGeometry(3.3,1.25,.18),glassExt);win.position.set(side*8,3.2+row*2.3,-.35);cinematicGroup.add(win);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(3.55,1.48,.16),metalExt);frame.position.copy(win.position);frame.position.z-=.08;cinematicGroup.add(frame);frame.material=metalExt;
 }
 const sign=new THREE.Mesh(new THREE.BoxGeometry(7,.9,.25),signExt);sign.position.set(0,8.3,-.42);cinematicGroup.add(sign);
 const signText=document.createElement('canvas');signText.width=1024;signText.height=128;const ctx=signText.getContext('2d');ctx.fillStyle='#b7b0a1';ctx.font='bold 64px monospace';ctx.textAlign='center';ctx.fillText('SITE 09  //  RESEARCH & CONTAINMENT',512,84);
 const tex=new THREE.CanvasTexture(signText);const label=new THREE.Mesh(new THREE.PlaneGeometry(6.7,.72),new THREE.MeshBasicMaterial({map:tex,transparent:true}));label.position.set(0,8.3,-.27);cinematicGroup.add(label);
 for(let x of [-3.2,3.2]){const lamp=new THREE.PointLight(0xb33c2d,16,15,2);lamp.position.set(x,6,-.8);cinematicGroup.add(lamp);const bulb=new THREE.Mesh(new THREE.BoxGeometry(.7,.16,.18),material(0x9d3428,.3,.1,{emissive:0x9d1c10,emissiveIntensity:1.8}));bulb.position.set(x,6,-.55);cinematicGroup.add(bulb);}
 for(let x=-12;x<=12;x+=4){const pillar=new THREE.Mesh(new THREE.BoxGeometry(.22,3.2,.22),metalExt);pillar.position.set(x,1.6,2.2);cinematicGroup.add(pillar);}
 const canopy=new THREE.Mesh(new THREE.BoxGeometry(13,.35,3.5),metalExt);canopy.position.set(0,6.1,1.1);cinematicGroup.add(canopy);
 // Rain is a lightweight point cloud animated during the cinematic.
 const rainCount=1100,positions=new Float32Array(rainCount*3);for(let i=0;i<rainCount;i++){positions[i*3]=(Math.random()-.5)*48;positions[i*3+1]=Math.random()*24;positions[i*3+2]=(Math.random()-.5)*38;}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));cinematicRain=new THREE.Points(geo,new THREE.PointsMaterial({color:0x9ba9a7,size:.045,transparent:true,opacity:.48}));cinematicGroup.add(cinematicRain);
 scene.add(cinematicGroup);
 const fill=new THREE.HemisphereLight(0x5b6870,0x101312,1.05);cinematicGroup.add(fill);
 const moon=new THREE.DirectionalLight(0x89979a,1.3);moon.position.set(-8,16,8);cinematicGroup.add(moon);
}
function speakLine(text,speaker){
 if(!('speechSynthesis' in window))return;
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=speaker==='PLAYER'?0.94:speaker==='UNKNOWN VOICE'?0.78:0.88;u.pitch=speaker==='UNKNOWN VOICE'?0.58:speaker==='PLAYER'?0.88:0.98;u.volume=.82;
  const voices=speechSynthesis.getVoices();const preferred=voices.find(v=>/english.*(united states|australia|united kingdom)/i.test(v.name+' '+v.lang))||voices.find(v=>/^en/i.test(v.lang));if(preferred)u.voice=preferred;speechSynthesis.speak(u);
 }catch(e){console.warn('Voice playback unavailable',e);}
}
function setCinematicLine(speaker,line,location){
 $('cine-speaker').textContent=speaker+' // RADIO TRANSMISSION';$('cine-line').textContent=line;
 if(location)$('cine-location').textContent=location;
 speakLine(line,speaker);noiseBurst(.07,.045,1800);
}
function finishOpeningCinematic(){
 if(cinematicTimer)clearTimeout(cinematicTimer);if('speechSynthesis'in window)speechSynthesis.cancel();
 $('cinematic').classList.remove('active');if(cinematicGroup){scene.remove(cinematicGroup);cinematicGroup=null;cinematicRain=null;}
 startLevel(0,true);
}
function startOpeningCinematic(){
 if(cinematicTimer)clearTimeout(cinematicTimer);cinematicSteps=[];cinematicStep=-1;
 initAudio();state='cinematic';$('overlay').classList.add('hidden');$('hud').style.display='none';$('cinematic').classList.add('active');$('cine-progress').style.width='0%';
 makeExterior();
 cinematicSteps=[
  {duration:5,from:[0,5,25],to:[0,4.8,18],look:[0,5,-5],speaker:'DISPATCH',line:'Unit Zero, radio check. Do you copy?',location:'SITE 09 // 02:14 AM'},
  {duration:5,from:[0,4.8,18],to:[-3,3.4,10],look:[0,4,-5],speaker:'PLAYER',line:'Loud and clear. I am approaching the facility now.',location:'PERIMETER // APPROACH'},
  {duration:6,from:[-3,3.4,10],to:[-1.3,2.5,5],look:[0,3,-1],speaker:'DISPATCH',line:'We have lost contact with the entire research team. No movement has been detected for approximately seventy-two hours.',location:'INCIDENT REPORT // 00-17'},
  {duration:5,from:[-1.3,2.5,5],to:[1.5,2.1,3],look:[0,2.8,-1],speaker:'PLAYER',line:'And you want me to investigate alone?',location:'SITE 09 // MAIN ENTRANCE'},
  {duration:6,from:[1.5,2.1,3],to:[0,2.1,1.8],look:[0,2.5,-2],speaker:'DISPATCH',line:'You are the only unit available. Recover the research data. Do not enter the lower levels.',location:'RADIO // SIGNAL DEGRADED'},
  {duration:5,from:[0,2.1,1.8],to:[0,2,1.2],look:[0,2.2,-2],speaker:'UNKNOWN VOICE',line:'Do not... let it see you.',location:'UNKNOWN SIGNAL // SOURCE UNIDENTIFIED'},
  {duration:4,from:[0,2,1.2],to:[0,1.9,.9],look:[0,2,-3],speaker:'DISPATCH',line:'Unit Zero? Did you hear that? Unit Zero, respond.',location:'TRANSMISSION LOST'}
 ];
 cinematicStarted=performance.now();cinematicStep=-1;state='cinematic';updateCinematic(0,0);
}
function updateCinematic(delta,time){
 if(!cinematicSteps.length)return;
 const elapsed=(performance.now()-cinematicStarted)/1000;let total=0,index=0;
 for(;index<cinematicSteps.length;index++){if(elapsed<total+cinematicSteps[index].duration)break;total+=cinematicSteps[index].duration;}
 if(index>=cinematicSteps.length){$('cine-progress').style.width='100%';finishOpeningCinematic();return;}
 const step=cinematicSteps[index],local=Math.max(0,Math.min(1,(elapsed-total)/step.duration));
 if(index!==cinematicStep){cinematicStep=index;setCinematicLine(step.speaker,step.line,step.location);}
 const ease=local*local*(3-2*local),from=new THREE.Vector3(...step.from),to=new THREE.Vector3(...step.to),lookA=new THREE.Vector3(...step.look),lookB=new THREE.Vector3(...step.look);
 camera.position.copy(from.lerp(to,ease));camera.lookAt(lookA.lerp(lookB,ease));
 $('cine-progress').style.width=(elapsed/cinematicSteps.reduce((a,b)=>a+b.duration,0)*100)+'%';
 if(cinematicRain){const a=cinematicRain.geometry.attributes.position;for(let i=0;i<a.count;i++){let y=a.getY(i)-delta*18;if(y<0)y=22;a.setY(i,y);}a.needsUpdate=true;}
}
function startSectorBriefing(i){
 cinematicSteps=[];cinematicStep=-1;state='cinematic';$('cinematic').classList.add('active');$('cine-progress').style.width='0%';
 const sector=i===3?'SECTOR II // LOWER FACILITY':'SECTOR III // DEEP CONTAINMENT';
 const line=i===3?'Field Unit 01, you are entering the lower facility. Power is unstable. Expect heavier resistance.':'Unit Zero, containment has failed below you. Whatever is inside the core must not reach the surface.';
 $('cine-location').textContent=sector;$('cine-speaker').textContent='DISPATCH // RADIO TRANSMISSION';$('cine-line').textContent=line;speakLine(line,'DISPATCH');noiseBurst(.1,.07,1600);
 const started=performance.now();const tick=()=>{if(state!=='cinematic')return;const t=(performance.now()-started)/5200;$('cine-progress').style.width=Math.min(100,t*100)+'%';if(t>=1){$('cinematic').classList.remove('active');if('speechSynthesis'in window)speechSynthesis.cancel();showGame();showNotice(sector+' // THREAT LEVEL '+(i+1));}else cinematicTimer=setTimeout(tick,80);};cinematicTimer=setTimeout(tick,80);
}

const SAVE_KEY="project-zero-save-v1";
let lastSaveAt=0;
function saveGame(force=false){
 if(state!=="playing")return;
 const now=performance.now();
 if(!force&&now-lastSaveAt<1800)return;
 lastSaveAt=now;
 try{
  const data={
   version:1,levelIndex,player:{x:player.x,z:player.z,height:playerHeight,yaw,pitch},
   health,ammo,reserve,keysFound,
   collected:collectibles.map(k=>!!k.taken),
   enemies:enemies.map(e=>({alive:e.alive,hp:e.hp,x:e.mesh.position.x,z:e.mesh.position.z})),
   savedAt:Date.now()
  };
  localStorage.setItem(SAVE_KEY,JSON.stringify(data));
 }catch(err){console.warn("Could not save Project Zero progress",err);}
}
function readSave(){
 try{
  const raw=localStorage.getItem(SAVE_KEY);
  if(!raw)return null;
  const data=JSON.parse(raw);
  if(!data||data.version!==1||!Number.isInteger(data.levelIndex)||data.levelIndex<0||data.levelIndex>=levels.length)return null;
  return data;
 }catch(err){return null;}
}
function clearSave(){
 try{localStorage.removeItem(SAVE_KEY);}catch(err){}
}
function refreshMenuButtons(){
 const saved=readSave();
 if($("newGameButton"))$("newGameButton").classList.toggle("hidden",!saved);
 if(state==="menu"&&saved){
  $("playButton").textContent="RESUME OPERATION";
  $("playButton").onclick=resumeSavedGame;
 }else if(state==="menu"){
  $("playButton").textContent="BEGIN OPERATION";
  $("playButton").onclick=startGame;
 }
}
function resumeSavedGame(){
 const data=readSave();
 if(!data){startGame();return;}
 initAudio();
 startLevel(data.levelIndex,false,true);
 player.set(data.player?.x??0,0,data.player?.z??8.8);
 playerHeight=data.player?.height??1.7;
 yaw=data.player?.yaw??0;pitch=data.player?.pitch??0;
 health=Math.max(1,Math.min(100,data.health??100));
 ammo=Math.max(0,Math.min(12,data.ammo??12));
 reserve=Math.max(0,Math.min(240,data.reserve??48));
 keysFound=0;
 if(Array.isArray(data.collected)){
  collectibles.forEach((k,i)=>{
   if(data.collected[i]){k.taken=true;world.remove(k.mesh);keysFound++;}
  });
 }
 if(Array.isArray(data.enemies)){
  enemies.forEach((e,i)=>{
   const saved=data.enemies[i];if(!saved)return;
   e.hp=saved.hp??e.hp;e.mesh.position.set(saved.x??e.mesh.position.x,0,saved.z??e.mesh.position.z);
   if(saved.alive===false){e.alive=false;world.remove(e.mesh);}
  });
 }
 camera.position.set(player.x,playerHeight,player.z);
 camera.rotation.set(pitch,yaw,0);
 updateHUD();
showLevelLoading(levelIndex,()=>{
 showGame();
 showNotice("SAVED OPERATION RESTORED");
});
}
function beginNewOperation(){
 clearSave();
 if($("newGameButton"))$("newGameButton").classList.add("hidden");
 startGame();
}

function showLevelLoading(levelIndex, callback){
    const screen = $("loading-screen");
    if(!screen){
        callback();
        return;
    }

    const level = levels[levelIndex];

    const sectorNames = [
        "SECTOR I // ENTRY & SECURITY",
        "SECTOR II // LOWER FACILITY",
        "SECTOR III // DEEP CONTAINMENT"
    ];

    const sectorIndex = Math.floor(levelIndex / 3);

    $("loading-sector").textContent =
        sectorNames[sectorIndex] || "SITE 09";

    $("loading-level").textContent =
        level.tag || "PREPARING ENVIRONMENT";

    const tips = [
        "SURVIVAL TIP: WATCH THE DARKNESS.",
        "SURVIVAL TIP: CONSERVE YOUR AMMUNITION.",
        "SURVIVAL TIP: LISTEN FOR MOVEMENT.",
        "SURVIVAL TIP: CHECK YOUR SURROUNDINGS.",
        "SURVIVAL TIP: NOT EVERY SOUND IS HUMAN."
    ];

    $("loading-tip").textContent =
        tips[Math.floor(Math.random() * tips.length)];

    $("loading-progress").style.width = "0%";
    $("loading-percent").textContent = "0%";

    screen.classList.remove("hidden");

    let progress = 0;

    const timer = setInterval(() => {
        progress = Math.min(100, progress + Math.floor(Math.random() * 13) + 7);

        $("loading-progress").style.width = progress + "%";
        $("loading-percent").textContent = progress + "%";

        if(progress >= 100){
            clearInterval(timer);

            setTimeout(() => {
                screen.classList.add("hidden");
                callback();
            }, 350);
        }
    }, 120);
}


function startLevel(i,fromOpening=false,skipBriefing=false){
 levelIndex=i;
 health=100;
 ammo=12;
 reserve=Math.min(120,48+i*7);
 keysFound=0;
 reloading=false;
 flashlightOn=false;
 scareUsed=false;
 nextAmbientEvent=performance.now()+12000+Math.random()*9000;

 if(flashlight){
  flashlight.visible=false;
  flashlight.intensity=0;
 }
 if(flashFill)flashFill.intensity=0;
 if(flashBeam)flashBeam.visible=false;

 $("flash-status").textContent="[F] FLASHLIGHT: OFF";

 if(i === 1){
    player.set(2,0,5);
}else{
    player.set(0,0,5);
}
 playerHeight=1.7;
 velocityY=0;
 onGround=true;
 yaw=0;
 pitch=0;

 if(cinematicGroup){
  scene.remove(cinematicGroup);
  cinematicGroup=null;
 }

 buildRoom(levels[i]);
 camera.position.set(player.x,playerHeight,player.z);
 camera.rotation.set(0,0,0);
 updateHUD();

 if((i===3||i===6)&&!skipBriefing){
  showLevelLoading(i,()=>{
   startSectorBriefing(i);
  });
  return;
 }

 showLevelLoading(i,()=>{
  showGame();
  showNotice(levels[i].tag+" // THREAT LEVEL "+(i+1));
 });
}

function startGame(){clearSave();startOpeningCinematic();}
function nextLevel(){if(levelIndex<levels.length-1)startLevel(levelIndex+1);else winGame();}
function pauseGame(){
 if(state!=="playing")return;
 document.exitPointerLock?.();
 setOverlay("PAUSED","FIELD UNIT 01 // PAUSE","The facility remains active. Your position and recovered access keys are preserved.","RESUME",()=>{showGame();});
}
function winGame(){
 document.exitPointerLock?.();
 setOverlay("FACILITY ESCAPED","INCIDENT REPORT // CLOSED","You made it out of Site 09. The transmission ends here. For now.","PLAY AGAIN",startGame);
}
function die(){
 if(state!=="playing")return;
 document.exitPointerLock?.();
 setOverlay("CONTAINMENT BREACH","VITAL SIGNS // LOST","Field unit 01 is no longer responding. The facility has reclaimed another visitor.","RESTART SECTOR",()=>startLevel(levelIndex));
}

function reload(){
    if(state !== "playing" || reloading || ammo === 12 || reserve <= 0) return;

    reloading = true;
    sfx("reload");
    showNotice("RELOADING...");

    if(weapon){
        weapon.userData.reloading = true;
        weapon.userData.reloadStart = performance.now();
    }

    setTimeout(()=>{
        const amount = Math.min(12 - ammo, reserve);
        ammo += amount;
        reserve -= amount;
        reloading = false;

        if(weapon){
            weapon.userData.reloading = false;
        }

        updateHUD();
        showNotice("MAGAZINE INSERTED");
    }, 1450);
}



function shoot(){
    if(state !== "playing" ||
       document.pointerLockElement !== renderer.domElement ||
       reloading) return;

    const now = performance.now();

    if(now - lastShot < 125) return;
    lastShot = now;

    if(ammo <= 0){
        showNotice("MAGAZINE EMPTY // PRESS R");
        mouseFiring = false;
        return;
    }

    ammo--;
    updateHUD();
    sfx("shot");

    if(weapon){
        weapon.position.z = 0.13;
        weapon.rotation.x = -0.12;
        weapon.rotation.z = 0.025;
        weapon.userData.recoil = 1;
    }

    raycaster.setFromCamera(new THREE.Vector2(0,0),camera);

    const targets = [];

    enemies.forEach(e=>{
        if(e.alive){
            e.mesh.traverse(o=>{
                if(o.isMesh){
                    o.userData.stalker = e;
                    targets.push(o);
                }
            });
        }
    });

    const hit = raycaster.intersectObjects(targets,false)[0];

    if(hit){
        const e = hit.object.userData.stalker;

        if(e && e.alive){
            e.hp -= 50;
            e.hit = now;
            saveGame(true);

            if(e.hp <= 0){
                e.alive = false;
                world.remove(e.mesh);
                sfx("enemyDown");
                showNotice("HOSTILE NEUTRALISED");
                updateHUD();
            }else{
                sfx("hit");
                showNotice("TARGET HIT");
            }
        }
    }
}


function animate(){
 requestAnimationFrame(animate);

 const now = performance.now();
 const delta = Math.min((now - (animate.lastTime || now)) / 1000, 0.05);
 animate.lastTime = now;
 const time = now / 1000;

if(state === "cinematic"){
    updateCinematic(delta,time);
}

 if(state === "playing"){
    if(mouseFiring){
    shoot();
}

  
  // Optimised player movement
  let inputX = 0;
  let inputZ = 0;

  if(keys.w || keys.arrowup) inputZ -= 1;
  if(keys.s || keys.arrowdown) inputZ += 1;
  if(keys.a || keys.arrowleft) inputX -= 1;
  if(keys.d || keys.arrowright) inputX += 1;

  const moving = inputX !== 0 || inputZ !== 0;

  if(moving){
   const length = Math.hypot(inputX,inputZ);
   inputX /= length;
   inputZ /= length;

   const cos = Math.cos(yaw);
   const sin = Math.sin(yaw);

   const worldX = inputX*cos + inputZ*sin;
   const worldZ = -inputX*sin + inputZ*cos;

   const speed = (keys.shift ? 4.2 : 3.2) * delta;

   const nx = player.x + worldX*speed;
   const nz = player.z + worldZ*speed;

   if(canMove(nx,player.z)) player.x = nx;
   if(canMove(player.x,nz)) player.z = nz;
  }


  // Jumping and gravity
  if(keys[" "] && onGround){
   velocityY = 5.2;
   onGround = false;
  }

  velocityY -= 15 * delta;
  playerHeight += velocityY * delta;

  if(playerHeight <= 1.7){
   playerHeight = 1.7;
   velocityY = 0;
   onGround = true;
  }

  // Camera
  camera.position.set(player.x,playerHeight,player.z);
  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

// Level systems
updateKeys(time);
updateExit();

// Enemies and horror events
updateEnemies(delta,time);
updateHorrorEvents(time);

  // Weapon animation
  if(weapon){
   const moving = dir.lengthSq() > 0;
   const sprinting = moving && keys.shift;
   const bobSpeed = sprinting ? 13 : 8;
   const bobAmount = sprinting ? 0.025 : 0.012;

   const idleBreathing = Math.sin(time*1.8)*0.003;
   const movementBob = moving ? Math.sin(time*bobSpeed)*bobAmount : 0;

   const swayX = weapon.userData.swayX || 0;
   const swayY = weapon.userData.swayY || 0;

   weapon.position.y = -0.015 + idleBreathing + movementBob + swayY;
   weapon.position.x = (moving
    ? Math.cos(time*bobSpeed*0.5)*bobAmount*0.5 : 0)
    + Math.sin(time*1.5)*0.002 + swayX;

   weapon.userData.swayX = swayX*0.82;
   weapon.userData.swayY = swayY*0.82;

   const reloadTarget = weapon.userData.reloading ? 1 : 0;
   weapon.userData.reloadProgress = THREE.MathUtils.lerp(
    weapon.userData.reloadProgress || 0,
    reloadTarget,
    Math.min(1,delta*7)
   );

   const reloadAmount = weapon.userData.reloadProgress;
   const recoil = weapon.userData.recoil || 0;

   weapon.position.y -= reloadAmount*0.22;
   weapon.position.z = recoil*0.13;
   weapon.rotation.x = -recoil*0.12 + reloadAmount*0.28;
   weapon.rotation.z = (moving
    ? Math.sin(time*bobSpeed*0.5)*(sprinting?0.035:0.018)
    : Math.sin(time*1.5)*0.004) + reloadAmount*0.12;

   weapon.userData.recoil = Math.max(0,recoil-delta*5);
  }

  
// Optimised fluorescent lighting
if(time >= nextLightUpdate){
    nextLightUpdate = time + 0.05;

    for(const entry of lights){
        const flicker =
            Math.sin(time*2.4+entry.phase) > 0.985
            ? 0.28
            : 1;

        entry.light.intensity = entry.base*flicker;
    }
}


  // Screen shake
  if(screenShake > 0){
   camera.position.x = player.x+(Math.random()-0.5)*screenShake;
   camera.position.y = playerHeight+(Math.random()-0.5)*screenShake;
   screenShake = Math.max(0,screenShake-delta*0.9);
  }
 }

 renderer.render(scene,camera);
}

function toggleFlashlight(){
    if(state !== "playing") return;

    flashlightOn = !flashlightOn;

    if(flashlight){
        flashlight.visible = flashlightOn;
        flashlight.intensity = flashlightOn ? 1800 : 0;
    }

    if(flashFill){
        flashFill.intensity = flashlightOn ? 18 : 0;
    }

    if(flashBeam){
        flashBeam.visible = flashlightOn;
    }

    $("flash-status").textContent =
        "[F] FLASHLIGHT: " + (flashlightOn ? "ON" : "OFF");

    if(flashlightOn){
        tone(680, 0.055, "square", 0.035, -180);
        showNotice("FLASHLIGHT ONLINE");
    }else{
        tone(260, 0.07, "square", 0.03, -100);
        showNotice("FLASHLIGHT OFF");
    }
}

function triggerJumpscare(){
 if(scareUsed||state!=="playing")return;scareUsed=true;screenShake=.42;
 const scare=$("scare");$("scare-caption").textContent=["IT FOUND YOU","DON'T TURN AROUND","SUBJECT 09 IS AWAKE","YOU WERE NEVER ALONE","CONTAINMENT FAILED","WELCOME HOME"][levelIndex]||"IT FOUND YOU";
 scare.classList.remove("active");void scare.offsetWidth;scare.classList.add("active");
 noiseBurst(.48,.30,4200);tone(760,.13,"sawtooth",.14,-560);setTimeout(()=>tone(82,.38,"sawtooth",.18,-42),80);
 setTimeout(()=>scare.classList.remove("active"),720);
 showNotice("MOTION SENSOR // CRITICAL");
}

function updateKeys(time){
    for(const k of collectibles){
        if(k.taken) continue;

        k.mesh.rotation.y += 0.012;
        k.mesh.position.y = 0.9 + Math.sin(time * 2 + k.phase) * 0.08;

        if(Math.hypot(
            player.x - k.mesh.position.x,
            player.z - k.mesh.position.z
        ) < 1.8){
            k.taken = true;
            world.remove(k.mesh);
            keysFound++;

            sfx("pickup");
            updateHUD();
            saveGame(true);
            showNotice("ACCESS KEY RECOVERED");

            if(keysFound === collectibles.length){
                showNotice("ALL KEYS FOUND // EXIT UNLOCKED");
            }
        }
    }
}

function updateExit(){
    const d = levels[levelIndex].exit;
    const dist = Math.hypot(player.x - d[0], player.z - d[1]);

    if(dist < 2.4){
        $("interact").textContent =
            keysFound === collectibles.length
            ? "[ E ] OPEN BULKHEAD"
            : "BULKHEAD LOCKED // " +
              (collectibles.length - keysFound) +
              " KEYS REQUIRED";

        if(keysFound === collectibles.length && keys.e){
            keys.e = false;
            sfx("door");
            document.exitPointerLock?.();

            if(levelIndex === levels.length - 1){
                winGame();
            }else{
                setOverlay(
                    "LEVEL CLEARED",
                    "SITE 09 // ACCESS GRANTED",
                    "The bulkhead opens. Your field unit is moving deeper into the facility.",
                    "CONTINUE",
                    nextLevel
                );
            }
        }
    }else{
        $("interact").textContent = "";
    }
}

function updateEnemies(delta,time){
    if(state !== "playing") return;

    const playerX = player.x;
    const playerZ = player.z;
    const now = time * 1000;

    for(const e of enemies){
        if(!e.alive) continue;

        const enemyX = e.mesh.position.x;
        const enemyZ = e.mesh.position.z;

        const dx = playerX - enemyX;
        const dz = playerZ - enemyZ;
        const distSq = dx*dx + dz*dz;

        // Distant enemies update their idle animation at 10 FPS
        if(distSq >= 196){
            if(time < (e.nextIdleUpdate || 0)) continue;

            e.nextIdleUpdate = time + 0.1;

            e.mesh.position.y = Math.sin(time*2.2+e.phase)*0.035;
            e.mesh.rotation.z = Math.sin(time*1.8+e.phase)*0.035;

            continue;
        }

        // Nearby enemy animation
        e.mesh.position.y = Math.sin(time*2.2+e.phase)*0.035;
        e.mesh.rotation.z = Math.sin(time*1.8+e.phase)*0.035;

        // Chase player
        if(distSq > 1.1025){
            const dist = Math.sqrt(distSq);

            if(time-lastGrowl > 5.5 && distSq < 81){
                lastGrowl = time;
                sfx("growl");
            }

            const moveSpeed = e.speed*delta;
            const nx = enemyX + (dx/dist)*moveSpeed;
            const nz = enemyZ + (dz/dist)*moveSpeed;

            if(canMove(nx,enemyZ)) e.mesh.position.x = nx;
            if(canMove(e.mesh.position.x,nz)) e.mesh.position.z = nz;

            e.mesh.rotation.y = Math.atan2(dx,dz);
        }

        // Attack player
        if(distSq < 1.8225 && now-e.attack > 1000){
            e.attack = now;
            health = Math.max(0,health-e.damage);

            sfx("hit");
            updateHUD();
            saveGame(true);

            $("damage").style.background = "rgba(140,12,8,.3)";

            setTimeout(()=>{
                $("damage").style.background = "rgba(140,12,8,0)";
            },120);

            showNotice("CONTACT // HOSTILE ATTACK");

            if(health <= 0){
                die();
                return;
            }
        }
    }
}

function updateHorrorEvents(time){
 const point=levels[levelIndex].scare;
 // Major scares are reserved for the end of each three-level sector.
 if(point&&!scareUsed&&Math.hypot(player.x-point[0],player.z-point[1])<1.65)triggerJumpscare();
 if(performance.now()>nextAmbientEvent){
  nextAmbientEvent=performance.now()+26000+Math.random()*26000;
  const event=Math.random();
  if(event<.38){sfx("growl");showNotice("UNIDENTIFIED SOUND // NEARBY");}
  else if(event<.68){noiseBurst(.32,.12,850);tone(48,.45,"triangle",.05,-18);showNotice("IMPACT DETECTED // UNKNOWN LOCATION");}
  else {lights.forEach(l=>l.light.intensity=0);setTimeout(()=>lights.forEach(l=>l.light.intensity=l.base),650);showNotice("POWER FLUCTUATION");}
 }
}

function applyQuality(q){
 quality=q;
 const ultra=q==="ultra",low=q==="low";
 renderer.setPixelRatio(low?1:ultra?Math.min(devicePixelRatio,2):Math.min(devicePixelRatio,1.5));
 renderer.shadowMap.enabled=!low;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMappingExposure=ultra?1.3:low?1.18:1.24;
 renderer.setSize(innerWidth,innerHeight);
}
  

$("playButton").addEventListener("click",()=>{
    try{
        initAudio();
    }catch(err){
        console.error("Audio initialization failed:",err);
    }
});
$("newGameButton").addEventListener("click",beginNewOperation);
$("settingsButton").addEventListener("click",()=>$("settings").classList.toggle("hidden"));
$("storyButton").addEventListener("click",()=>{showNotice("STORY MODE // IN DEVELOPMENT");$("subtitle").textContent="THE FULL CAMPAIGN IS STILL CLASSIFIED.";$("description").textContent="Story Mode is planned for a future update, with cinematic missions, named characters, voice logs, narrative choices and a deeper explanation of Site 09. For now, survive all nine levels across three sectors.";});
$("cine-skip").addEventListener("click",()=>{if(state!=='cinematic')return;if(cinematicGroup)finishOpeningCinematic();else{if(cinematicTimer)clearTimeout(cinematicTimer);$('cinematic').classList.remove('active');if('speechSynthesis'in window)speechSynthesis.cancel();showGame();}});
$("applySettings").addEventListener("click",()=>{
 applyQuality($("quality").value);
 const s=$("sensitivity").value;mouseSensitivity=s==="low"?.0012:s==="high"?.0032:.002;
 showNotice("SYSTEM SETTINGS UPDATED");
});

document.addEventListener("keydown",e=>{
 const k=e.key.toLowerCase();keys[k]=true;
 if(k===" "||k.startsWith("arrow"))e.preventDefault();
 if(k===" "&&state==="cinematic"){if(cinematicGroup)finishOpeningCinematic();else{$("cine-skip").click();}}
 if(k==="escape"&&state==="playing")pauseGame();
 if(k==="r")reload();
 if(k==="f"&&!e.repeat)toggleFlashlight();
 document.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});
});

document.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
document.addEventListener("mousemove",e=>{
 if(state!=="playing"||document.pointerLockElement!==renderer.domElement)return;

yaw -= e.movementX * mouseSensitivity;
pitch -= e.movementY * mouseSensitivity;

pitch = Math.max(-1.35, Math.min(1.35, pitch));

// Weapon reacts naturally to mouse movement
if(weapon){
    weapon.userData.swayX = Math.max(-0.055, Math.min(0.055,
        (weapon.userData.swayX || 0) - e.movementX * 0.00035));

    weapon.userData.swayY = Math.max(-0.04, Math.min(0.04,
        (weapon.userData.swayY || 0) + e.movementY * 0.00025));
}

});
document.addEventListener("mousedown",e=>{if(e.button===0)shoot();});
document.addEventListener("pointerlockchange",()=>{
    mouseFiring = false;
    if(state === "playing" &&
       document.pointerLockElement !== renderer.domElement){
        $("interact").textContent = "CLICK TO RESUME MOUSE CONTROL";
    }else if(state === "playing"){
        $("interact").textContent = "";
    }
});

renderer.domElement.addEventListener("click",()=>{
 if(state==="playing"&&document.pointerLockElement!==renderer.domElement){initAudio();renderer.domElement.requestPointerLock?.();}
});

renderer.domElement.addEventListener("mousedown",e=>{
    if(e.button !== 0) return;
    if(state !== "playing") return;

    mouseFiring = true;
    shoot();
});

document.addEventListener("mouseup",e=>{
    if(e.button === 0){
        mouseFiring = false;
    }
});

window.addEventListener("resize",()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
});
try{
 applyQuality("medium");buildRoom(levels[0]);camera.add(new THREE.Group());
 camera.position.set(player.x,playerHeight,player.z);
 // Detailed first-person PZ-01 pistol: frame, slide, barrel, sights, grip, trigger and fasteners.
 weapon=new THREE.Group();
 const gunBlack=material(0x202322,.32,.82),gunSteel=material(0x62645f,.24,.9),rubber=material(0x171918,.92,.05),brass=material(0x8a6940,.3,.8);
 addBox(weapon,.205,.17,.56,.34,-.29,-.56,gunBlack); // receiver
 addBox(weapon,.19,.095,.43,.34,-.205,-.57,gunSteel); // slide
 addBox(weapon,.13,.045,.31,.34,-.148,-.58,gunBlack); // top channel
 const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(.052,.058,.18,16),gunBlack);muzzle.rotation.x=Math.PI/2;muzzle.position.set(.34,-.245,-.91);weapon.add(muzzle);
 const bore=new THREE.Mesh(new THREE.CircleGeometry(.027,16),material(0x050606,.2,.2));bore.position.set(.34,-.245,-1.005);weapon.add(bore);
 const grip=addBox(weapon,.145,.31,.19,.34,-.49,-.42,rubber);grip.rotation.x=-.18;
 for(let i=0;i<5;i++)addBox(weapon,.15,.018,.018,.34,-.39-i*.045,-.32,rust,false);
 const trigger=new THREE.Mesh(new THREE.TorusGeometry(.07,.012,6,14,Math.PI),gunSteel);trigger.position.set(.34,-.36,-.52);trigger.rotation.y=Math.PI/2;weapon.add(trigger);
 addBox(weapon,.06,.035,.06,.34,-.12,-.43,gunSteel);addBox(weapon,.055,.045,.055,.34,-.12,-.72,gunSteel);
 addBox(weapon,.035,.025,.25,.34,-.12,-.58,brass);
 // Under-barrel tactical flashlight housing and lens.
 addBox(weapon,.105,.075,.24,.34,-.405,-.69,gunBlack);
 const lens=new THREE.Mesh(new THREE.CylinderGeometry(.043,.043,.025,16),material(0x9db6b9,.15,.25,{emissive:0x9db6b9,emissiveIntensity:.5}));lens.rotation.x=Math.PI/2;lens.position.set(.34,-.405,-.825);weapon.add(lens);
 camera.add(weapon);
 // First-person arms and hands. Separate high-contrast geometry makes the grip readable at normal gameplay FOV.
 const sleeve=material(0x77786b,.9,.02,{emissive:0x151610,emissiveIntensity:.18});
 const sleeveCuff=material(0xaaa28c,.82,.03,{emissive:0x17140f,emissiveIntensity:.12});
 const glove=material(0x555b52,.88,.02,{emissive:0x10130f,emissiveIntensity:.16});
 const gloveEdge=material(0x8a8c7c,.82,.02,{emissive:0x181a14,emissiveIntensity:.1});
 function limbBetween(a,b,r1,r2,mat){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=new THREE.Vector3().subVectors(B,A);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,dir.length(),16),mat);
  mesh.position.copy(A).add(B).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());mesh.renderOrder=3;weapon.add(mesh);return mesh;
 }
 function capsule(parent,r,len,x,y,z,mat,rotX=0,rotZ=0){
  const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,len,5,10),mat);m.position.set(x,y,z);m.rotation.set(rotX,0,rotZ);m.renderOrder=4;parent.add(m);return m;
 }
 // Right arm: sleeve, cuff, palm and four curled fingers clearly visible around the grip.
 limbBetween([.94,-1.08,.04],[.57,-.66,-.18],.19,.155,sleeve);
 limbBetween([.57,-.66,-.18],[.43,-.49,-.34],.155,.13,sleeveCuff);
 const rightPalm=new THREE.Mesh(new THREE.BoxGeometry(.29,.19,.23),glove);rightPalm.position.set(.37,-.445,-.405);rightPalm.rotation.z=-.12;rightPalm.renderOrder=4;weapon.add(rightPalm);
 for(let i=0;i<4;i++){
  const f=capsule(weapon,.038,.105,.25+i*.058,-.48-i*.018,-.545,glove,1.05,-.08);
  const knuckle=new THREE.Mesh(new THREE.BoxGeometry(.043,.014,.012),gloveEdge);knuckle.position.set(.25+i*.058,-.438-i*.018,-.568);knuckle.renderOrder=5;weapon.add(knuckle);
 }
 capsule(weapon,.045,.13,.22,-.385,-.435,glove,.6,-.75); // thumb across grip
 // Left arm reaches under the slide, with an open support palm and curled fingers.
 limbBetween([-.91,-1.08,.08],[-.18,-.68,-.43],.19,.15,sleeve);
 limbBetween([-.18,-.68,-.43],[.13,-.53,-.68],.15,.13,sleeveCuff);
 const leftPalm=new THREE.Mesh(new THREE.BoxGeometry(.36,.15,.25),glove);leftPalm.position.set(.17,-.505,-.755);leftPalm.rotation.z=.08;leftPalm.renderOrder=4;weapon.add(leftPalm);
 for(let i=0;i<4;i++){
  capsule(weapon,.034,.105,.035+i*.075,-.565,-.82,glove,1.18,.05);
 }
 capsule(weapon,.04,.12,.33,-.475,-.73,glove,.55,.9);
 // Cuff seams and stitched panels catch the facility lighting.
 for(let side of [-1,1]){
  const seam=new THREE.Mesh(new THREE.BoxGeometry(.018,.24,.025),gloveEdge);seam.position.set(side*.04,-.66,-.2);seam.rotation.z=side*.48;seam.renderOrder=5;weapon.add(seam);
 }

// PROJECT ZERO: Flashlight system
flashlight = new THREE.SpotLight(0xe5eee8, 0, 38, 0.48, 0.25, 1);
flashlight.position.set(0, -0.12, -0.2);

flashTarget = new THREE.Object3D();
flashTarget.position.set(0, -0.15, -22);
camera.add(flashTarget);

flashlight.target = flashTarget;
camera.add(flashlight);

flashFill = new THREE.PointLight(0xdce8e7, 0, 9, 2);
flashFill.position.set(0, -0.15, -0.5);
camera.add(flashFill);

// Visible flashlight beam
const beamMat = new THREE.MeshBasicMaterial({
    color: 0xd9efff,
    transparent: true,
    opacity: 0.19,
    depthWrite: false,
    side: THREE.DoubleSide
});

flashBeam = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 20, 48, 1, true),
    beamMat
);

flashBeam.rotation.x = -Math.PI / 2;
flashBeam.position.set(0, -0.15, -10);
flashBeam.visible = false;
camera.add(flashBeam);

flashlight.castShadow = quality === "ultra";
flashlight.shadow.mapSize.set(1024, 1024);

camera.position.set(player.x, playerHeight, player.z);

 animate();
 $("playButton").disabled=false;$("playButton").textContent="BEGIN OPERATION";
 $("loading").textContent="SITE 09 CONNECTION ESTABLISHED";
 $("playButton").onclick=startGame;
}catch(err){
 console.error("PROJECT ZERO 0.6.0 INIT ERROR",err);
 $("title").textContent="INITIALISATION FAILED";
 $("description").textContent="The facility could not be loaded. Check your internet connection and reload the page.\n\n"+err.message;
 $("loading").textContent="ERROR // "+err.message;
 $("playButton").textContent="UNAVAILABLE";$("playButton").disabled=true;
}
