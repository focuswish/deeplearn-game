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
import Avatar from './components/Avatar'
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

  ctx.zoom = 1;
  ctx.tilt = -3;

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
    //let altitude = fractal.generateTerrain(100, 100, 0.4)
    
    let heightmap = await fetch('/heightmap')
      .then(resp => resp.json())
    
    console.log(heightmap)

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
  let avatarId = uuid()
  let avatar = Avatar(avatarId)

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

  const time = () => new Date().getTime() / 1000;

  let start = time()
  let lastUpdated = time()

  function updatePhysics() {
    // Step the physics world
    var timeSinceLastCall = time() - start
 
    //ctx.world.step(timeStep)
    ctx.world.step(timeStep, timeSinceLastCall, maxSubSteps);
    
    base.sync('snowballs')
    base.sync('boxes')

    //ctx.avatar.position.copy(ctx.playerSphereBody.position)
    //ctx.avatar.children[0].quaternion.copy(ctx.playerSphereBody.quaternion)
  
    if(Object.keys(ctx.data).length > 0) {
      Object.keys(ctx.data).forEach(key => {
        let player = ctx.data[key]
        //let nextPosition = player.body.position;
        //let currentMeshPosition = new CANNON.Vec3().copy(player.mesh.position)
        //let nextMeshPosition = new CANNON.Vec3()

        //if(player.shouldUpdate) {
        //  lastUpdated = time() 
        //  player.shouldUpdate = false;
        //}
        //let diff = time() - lastUpdated;
        //if(diff > 1) diff = 1;
        //currentMeshPosition.lerp(nextPosition, diff, player.mesh.position)
        player.mesh.position.copy(player.body.position)
        player.mesh.children[0].quaternion.copy(player.body.quaternion)
      })
    }
    ctx.controls.update(timeSinceLastCall);

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

        let snowball = cannonContext.createSnowball(message.id)

        snowball.body.velocity.set(  
          message.velocity.x,
          message.velocity.y,
          message.velocity.z
        )
    
        snowball.body.position.set(
          message.position.x,
          message.position.y,
          message.position.z
        );
        snowball.mesh.position.set(
          message.position.x,
          message.position.y,
          message.position.z
        );

        return
      }

      if(message.type !== 'player') return

      if(!ctx.data[message.id]) ctx.data[message.id] = {}
        
      let cached = ctx.data[message.id]
      cached.message = message;

      if(message.id === avatarId) return  

      if(!cached.didSpawn) {
        ctx.data[message.id].didSpawn = true;

        let snowman = Avatar(message.id)
        ctx.scene.add(snowman)
        ctx.data[message.id].mesh = snowman
  
        let playerSphereShape = new CANNON.Sphere(0.3)
        let playerSphereBody = new CANNON.Body({ 
          mass: 1, 
          material: cannonContext.physicsMaterial 
        })
          
        playerSphereBody.addShape(playerSphereShape)
        playerSphereBody.linearDamping = 0.9;
        playerSphereBody.addEventListener('collide', function(evt) {
          console.log('evt', evt)
        });
        
        cannonContext.world.addBody(playerSphereBody)
        ctx.data[message.id].body = playerSphereBody
      } 

      ctx.data[message.id].latency = time() - cached.timestamp

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
