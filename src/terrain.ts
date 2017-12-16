//scene and camera setup
import * as THREE from 'three'
import * as ImprovedNoise from 'improved-noise'
import * as TrackballControls from 'three-trackballcontrols'
import * as fractal from 'fractal-terrain-generator'
import Sprite from './sprite'
import Tree from './tree';
import { sample, findIndex, flatten, chunk, take, tail} from 'lodash'
import * as CANNON from 'cannon'

import Terrain from './three/Terrain'
import { Physics } from './three/physics'
import {
  Rock, 
  Wood, 
  Stone, 
  generateTerrainObjects,
  generateCampfire
} from './three/objects'
import Avatar from './three/Avatar'

import PointerLockControls from './util/PointerLockControls'

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

function World() {
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

  function createMap() {
    ctx.terrain.geometry = new THREE.Geometry();
    let altitude = fractal.generateTerrain(100, 100, 0.4)

    let terrain = Terrain({
      position: [0, 0, 0],
      color: 0x7cfc00,
      altitude: altitude
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

  createMap()
  light()

  ctx.avatar = Avatar()
  ctx.scene.add(ctx.avatar)
  ctx.scene.updateMatrixWorld()

  let cannonContext = Physics(ctx)
  
  let { 
      world, 
      base,
      playerSphereBody,
  } = cannonContext;

  //generateTerrainObjects(ctx, randomPositionOnTerrain())
  //generateCampfire(ctx)

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
  let start = Date.now()
  
  function updatePhysics() {
    // Step the physics world
    ctx.world.step(timeStep)
  
    base.sync('snowballs')
    base.sync('boxes')

    ctx.avatar.position.copy(ctx.playerSphereBody.position)
    ctx.avatar.children[0].quaternion.copy(ctx.playerSphereBody.quaternion)
  
    ctx.controls.update(Date.now() - start);

    base.update()
      
    start = Date.now() 
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

  ctx.init = () => {
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
  
    return ctx;
  }
  
  return ctx;
}

window.World = World
window.Sprite = Sprite;

declare global {
  interface Window { 
    camera: any;
    Terrain: any;
    Sprite: any;
    World: any;
    
  }
}


World().init()