//scene and camera setup
import * as THREE from 'three'
import * as fractal from 'fractal-terrain-generator'
import { sample, findIndex, flatten, chunk, take, tail } from 'lodash'
import * as CANNON from 'cannon'
import { Physics } from './Physics'
import {
  Rock, 
  Wood, 
  Stone, 
  generateTerrainObjects,
  generateCampfire
} from './components/objects'
import Terrain from './components/Terrain'
import Snowman from './components/Snowman'
import Tree from './components/Tree';
import PointerLockControls from './util/PointerLockControls'
import * as uuid from 'uuid/v4'

function segment(matrix, vertices) {  
  let n = Math.sqrt(vertices.length)

  let offset = (n - 10) / 10;
  let [x, y] = matrix;
  
  x *= offset;
  y *= offset;

  let rows = chunk(vertices, n)

  let out = flatten(
    rows
    .slice(x, x + offset)
    .map(row => row.slice(y, y + offset))
  )

  return out
}

function segmentTopography(topography, matrix) {
  let offset = Math.sqrt(topography.length - 1) // 10

  let [x, y] = matrix;
  x *= offset;
  y *= offset;
  
  offset += 1;
  let out = flatten(
    topography
    .slice(y, y + offset)
    .reverse()
    .map(row => row.slice(x, x + offset))
  )

  return out;
}

async function World() {
  let ctx : any = {}
  ctx.worldSize = 100;
  ctx.tiles = []
  ctx.terrain = {}
  ctx.controls = {}
  ctx.scene = new THREE.Scene()
  ctx.camera = new THREE.PerspectiveCamera(
    75, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    1000
  );  
  ctx.renderer = new THREE.WebGLRenderer()

  ctx.renderer.setPixelRatio( window.devicePixelRatio );
  ctx.renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(ctx.renderer.domElement);

  ctx.zoom = 2;
  ctx.tilt = -4;

  ctx.camera.position.x = 0;
  ctx.camera.position.y = ctx.tilt;
  ctx.camera.position.z = ctx.zoom
  ctx.camera.lookAt(0, 0, 0);
  ctx.camera.up.set(0, 0, 1);
  
  THREE.Object3D.DefaultUp.set(0, 0, 1)


  let HOST = location.origin.replace(/^http/, 'ws')
  ctx.ws = new WebSocket(HOST);
  ctx.data = {}

  function getZ (x, y) {
    let { terrain: { geometry: { vertices } } } = ctx;
    
    let index = findIndex(vertices, { 
      x: Math.round(x),
      y: Math.round(y)
    })

    let z = vertices[index] ? vertices[index].z : 0

    return z;
  }

  function randomPositionOnTerrain() {
    let x = Math.round(Math.random() * 100) - 50
    let y = Math.round(Math.random() * 100) - 50
    let z = getZ(x, y)
    return [x, y, z]
  }

  ctx.randomPositionOnTerrain = randomPositionOnTerrain

  function light() {
    let light = new THREE.HemisphereLight(0xfffafa,0x000000, .7)
    let sun = new THREE.DirectionalLight( 0xcdc1c5, 0.9);
    sun.position.set(-10, -10, 10)
    sun.castShadow = true;

    ctx.scene.add(light)
    ctx.scene.add(sun)

    return ctx;
  }

  async function createMap() {
    ctx.terrain.geometry = new THREE.Geometry();    
    let heightmap = await fetch('/heightmap')
      .then(resp => resp.json())
    
    let terrain = Terrain({
      position: [0, 0, 0],
      color: 0x7cfc00,
      altitude: heightmap
    })

    ctx.tiles.push(terrain)
    ctx.scene.add(terrain)
    ctx.terrain.geometry.vertices = ctx.terrain.geometry.vertices.concat(
      terrain.geometry.vertices
    )

    /*for(let i = 0; i < 1; i++) {
      for(let j = 0; j < 1; j++) {
        
        let terrain = Terrain({
          position: [i * 10, j * 10, 0],
          color: i < 4 && j < 4 ? 0x7cfc00 : null,
          altitude: segmentTopography(altitude, [i, j])
        })

        ctx.tiles.push(terrain)

        ctx.scene.add(terrain)

        ctx.terrain.geometry.vertices = ctx.terrain.geometry.vertices.concat(
          terrain.geometry.vertices
        )

      }
    }*/
  }
  ctx.scene.background = new THREE.Color(0x191970)
  ctx.scene.fog = new THREE.FogExp2( 0x000000, 0.0025 * 50);

  await createMap()

  light()

  
  
  const loadFont = async () => {
    let loader = new THREE.FontLoader();
    return new Promise((resolve, reject) => {
      loader.load('/fonts/helvetiker.json', font => resolve(font))
    })
  }

  let font = await loadFont()
  console.log(font)
  let avatarId = uuid()
  let avatar = Snowman(avatarId, font)

  ctx.data[avatar.name] = {}
  ctx.data[avatar.name].mesh = avatar;
  ctx.data[avatar.name].didSpawn = false;
  ctx.data[avatar.name].id = avatar.name
  ctx.data[avatar.name].timestamp = new Date().getTime() / 1000

  ctx.scene.add(ctx.data[avatar.name].mesh)

  ctx.avatar = ctx.data[avatar.name].mesh;

  ctx.scene.updateMatrixWorld()

  let cannonContext = Physics(ctx)
  
  let { 
      world, 
      base,
      playerSphereBody,
  } = cannonContext;
  ctx.data[avatar.name].body = playerSphereBody;

  // CANNON
  ctx.world = cannonContext.world;
  ctx.playerSphereBody = playerSphereBody;

  cannonContext.spawnBoxes()
  cannonContext.spawnTrees()

  function onWindowResize() {
    ctx.camera.aspect = window.innerWidth / window.innerHeight;
    ctx.camera.updateProjectionMatrix();
    ctx.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  let timeStep = 1/60
  let fixedTimeStep = 0.5; // seconds
  let maxSubSteps = 3;   

  function lerp(v1, v2, t) {
    
    let target = new THREE.Vector3(
      v1.x + (v2.x - v1.x) * t,
      v1.y + (v2.y - v1.y) * t,
      v1.z + (v2.z - v1.z) * t
    )

    return target
  }

  const time = () => new Date().getTime() / 1000;
  
  let start = time()
  let lastUpdated = time()
  
  function updatePhysics() {
    // Step the physics world
    var timeSinceLastCall = time() - start
    ctx.world.step(timeStep, timeSinceLastCall, maxSubSteps);
    
    base.sync('snowballs')
    base.sync('boxes')
    base.sync('icelances')
     
    let players = Object.keys(ctx.data)
     

    if(players.length > 0) {
      players.forEach(key => {
        let player = ctx.data[key]
        let vec = new CANNON.Vec3().copy(player.mesh.position)
        
        //player.mesh.position.copy(player.body.position)
        //player.mesh.children[0].quaternion.copy(player.body.quaternion)

        if(player.id === avatarId) {
          
          player.mesh.position.copy(player.body.position)
          player.mesh.children[0].quaternion.copy(player.body.quaternion)
        } else {
          if(player.shouldUpdate) {
            ctx.data[key].shouldUpdate = false;
            lastUpdated = time()
          }

          let t = time() - lastUpdated;
          player.mesh.position.copy(
            lerp(
              player.mesh.position, 
              player.body.position, 
              t
            )
          )
        }
      })
    }

    ctx.controls.update(timeSinceLastCall)
    base.update()
      
    start = time()
  }

  function render() {    
    updatePhysics()
    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  function animate() {
    requestAnimationFrame(animate);

    let {
      position: {
        x, y, z
      }
    } = ctx.avatar

    ctx.camera.position.setZ(z + ctx.zoom)
    render()
  }

  function init() {
    window.addEventListener('resize', onWindowResize, false)
    
    let pointerlockchange = function ( event ) {
      ctx.controls.enabled = true;
    }

    document.addEventListener( 'pointerlockchange', pointerlockchange, false );
    document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
    document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );   

    ctx.controls = new PointerLockControls(ctx.camera, ctx.playerSphereBody, ctx.avatar);
  
    ctx.scene.add(ctx.controls.getObject())
  
    animate()

    base = base.apply(ctx)
    console.log('base', base)
    base.tick()

    window.addEventListener('keydown', function(e) {
      let position = ctx.playerSphereBody.position.toArray().map(p => Math.round(p))

      document.getElementById('info').innerHTML = `<span>${position.join(', ')}<span>` ;

      switch(e.code) {
        case 'Equal':
          ctx.zoom--
        break
      case 'Minus':
          ctx.zoom++
        break
      case 'Backquote':
        if(ctx.controls.enabled) {
          ctx.controls.enabled = false;
        } else {
          ctx.controls.enabled = true;
        }
        break;
      }
    })

    ctx.ws.onmessage = function (event) {
      let message = JSON.parse(event.data)
      
      if(message.type === 'snowball') {

        let snowball = cannonContext.createIceLance(
          message.id,
          new THREE.Vector3(
            message.position.x,
            message.position.y,
            message.position.z
          ),
          new THREE.Vector3(
            message.velocity.x,
            message.velocity.y,
            message.velocity.z
          )
        )

        return
      }

      if(message.type !== 'player') return

      if(!ctx.data[message.id]) ctx.data[message.id] = {}
        
      let cached = ctx.data[message.id]
      cached.message = message;

      if(message.id === avatarId) return  

      if(!cached.didSpawn) {
        ctx.data[message.id].didSpawn = true;

        let snowman = Snowman(message.id, font)
        ctx.scene.add(snowman)
        ctx.data[message.id].mesh = snowman
  
        let playerSphereBody = cannonContext.createPlayerSphere()
        
        cannonContext.world.addBody(playerSphereBody)
        ctx.data[message.id].body = playerSphereBody
      } 

      ctx.data[message.id].latency = time() - cached.timestamp
      ctx.data[message.id].shouldUpdate = true;

      let { position, velocity } = message;

      let nextPosition = new CANNON.Vec3(position.x, position.y, position.z)
      let nextVelocity = new CANNON.Vec3(velocity.x, velocity.y, velocity.z)
    
      cached.body.position.copy(nextPosition)
      cached.body.velocity.copy(nextVelocity)

      console.log(ctx.data)
    };
  
    return ctx;
  }
  
  init()

  return ctx;
}

window.World = World

declare global {
  interface Window { 
    camera: any;
    Terrain: any;
    Sprite: any;
    World: any;
    
  }
}


let world = World()
