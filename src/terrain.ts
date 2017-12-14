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
import { initCannon } from './three/physics'
import {
  Rock, 
  Wood, 
  Stone, 
  generateTerrainObjects,
  generateTrees,
  generateCampfire
} from './three/objects'

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
  ctx.tiles = 100;
  ctx.terrain = {}
  ctx.scene = new THREE.Scene()
  ctx.camera = new THREE.PerspectiveCamera(
    75, 
    window.innerWidth / window.innerHeight, 
    1, 
    1000
  );  
  ctx.renderer = new THREE.WebGLRenderer()

  ctx.renderer.setPixelRatio( window.devicePixelRatio );
  ctx.renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(ctx.renderer.domElement);

  ctx.zoom = 1;
  ctx.tilt = 2;

  ctx.camera.position.x = 0;
  ctx.camera.position.y = 0;
  ctx.camera.position.z = ctx.zoom
  ctx.camera.lookAt(0, 0, 0);
  ctx.camera.up.set(0, 0, 1);
  
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
    let x = Math.round(Math.random() * 5)
    let y = Math.round(Math.random() * 5)
    let z = getZ(x, y)
    return [x, y, z]
  }

  function avatar() {
    let geometry = new THREE.SphereGeometry(0.2, 32, 32 );

    let material = new THREE.MeshLambertMaterial({ 
      color: 0x00bfff,
      flatShading: true,
      vertexColors: THREE.VertexColors 
    });

    ctx.avatar = new THREE.Mesh(geometry, material);  
    ctx.scene.add(ctx.avatar) 
  }

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
    let altitude = fractal.generateTerrain(100, 100, 0.5)

    for(let i = 0; i < 1; i++) {
      for(let j = 0; j < 1; j++) {
        
        let terrain = Terrain({
          position: [i * 10, j * 10, 0],
          color: i < 4 && j < 4 ? 0x7cfc00 : null,
          altitude: segmentTopography(altitude, [i, j])
        })

        ctx.scene.add(terrain)
        ctx.terrain.geometry.vertices = ctx.terrain.geometry.vertices.concat(
          terrain.geometry.vertices
        )

      }
    }
  }

  //let sky = new THREE.TextureLoader().load(assets.sky)
  //ctx.scene.background = sky;
  //ctx.scene.background = new THREE.Color(0x191970)
  ctx.scene.background = new THREE.Color( 0xefd1b5 );
  ctx.scene.fog = new THREE.FogExp2( 0x191970, 0.0025);

  createMap()

  light()
  
  avatar()
  
  generateTrees(ctx, randomPositionOnTerrain())
  
  //generateTerrainObjects(ctx, randomPositionOnTerrain())
  
  //generateCampfire(ctx)

  // CANNON

  let { world, ballMeshes, balls, sphereBody } = initCannon(ctx)

  console.log({world, ballMeshes, balls, sphereBody})
  
  ctx.world = world;
  ctx.sphereBody = sphereBody;

  function onWindowResize() {
    ctx.camera.aspect = window.innerWidth / window.innerHeight;
    ctx.camera.updateProjectionMatrix();
    ctx.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  let timeStep = 1/60

  function updatePhysics() {
    // Step the physics world
    ctx.world.step(timeStep)
    
    for(var i=0; i< balls.length; i++ ){
      ballMeshes[i].position.copy(balls[i].position);
      ballMeshes[i].quaternion.copy(balls[i].quaternion);
    }

    // Copy coordinates from Cannon.js to Three.js
    ctx.avatar.position.copy(ctx.sphereBody.position)
    ctx.avatar.quaternion.copy(ctx.sphereBody.quaternion)
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

    ctx.camera.position.set(x, y - ctx.tilt, z + ctx.zoom)
    ctx.camera.lookAt(x, y, z)  

    render()
  }

  ctx.init = () => {
    window.addEventListener('resize', onWindowResize, false)
    animate()
   
    window.addEventListener('keydown', function(e) {
      let { vertices } = ctx.terrain.geometry

      let position = ctx.sphereBody.position.toArray()
      let nextPosition = position;
      let offset = 0.6
      let force = 1;
      let z;
      
      document.getElementById('info').innerHTML = `<span>${position.join(', ')}<span>`  

      switch (e.code) {
        case 'ArrowUp':
          position[1] += -0.2
          ctx.sphereBody.applyImpulse(
            new CANNON.Vec3(0, force, 0),
            new CANNON.Vec3(...position)
          )
          break;
        case 'ArrowRight':
          position[0] += -0.2
          ctx.sphereBody.applyImpulse(
            new CANNON.Vec3(force, 0, 0),
            new CANNON.Vec3(...position)
          )
          break
        case 'ArrowLeft':
          //-y
          position[0] += 0.2
          ctx.sphereBody.applyImpulse(
            new CANNON.Vec3(force * -1, 0, 0),
            new CANNON.Vec3(...position)
          )
          break
        case 'ArrowDown':
          //+x
          position[1] += 0.2
          ctx.sphereBody.applyImpulse(
            new CANNON.Vec3(0, force * -1, 0),
            new CANNON.Vec3(...position)
          )
          
        case 'Equal':
          ctx.zoom--
          break
        case 'Minus':
          ctx.zoom++
          break
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