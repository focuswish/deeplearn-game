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

  function avatar() {
    let material = new THREE.MeshLambertMaterial({ 
      color: 0xfffafa,
      flatShading: true,
      vertexColors: THREE.VertexColors 
    });

    let cylinderMaterial = new THREE.MeshBasicMaterial()
    cylinderMaterial.opacity = 0.01;

    let cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry( 0.6, 0.6, 1.25), 
      cylinderMaterial
    )

    cylinder.rotation.set(0, 0, Math.PI / 2)

    let avatarGeometry = new THREE.Geometry()
    
    let bottom = 0.60;
    let middle = 0.40;
    let top = 0.25;

    let sphereGeometry1 = new THREE.DodecahedronGeometry(top/2, 0);
    let sphereGeometry2 = new THREE.DodecahedronGeometry(middle/2, 1);
    let sphereGeometry3 = new THREE.DodecahedronGeometry(bottom/2, 1);
    
    let sphereMesh1 = new THREE.Mesh(sphereGeometry1, material)
    let sphereMesh2 = new THREE.Mesh(sphereGeometry2, material)
    let sphereMesh3 = new THREE.Mesh(sphereGeometry3, material)
    
    sphereMesh1.geometry.translate(0, 0, 0.80)
    sphereMesh2.geometry.translate(0, 0, 0.50)
    
    //avatarGeometry.merge(sphereMesh1.geometry, sphereMesh1.matrix)
    //avatarGeometry.merge(sphereMesh2.geometry, sphereMesh2.matrix)
    //avatarGeometry.merge(sphereMesh3.geometry, sphereMesh3.matrix)
    //avatarGeometry.merge(cylinder.geometry, cylinder.matrix)

    //let avatarMesh = new THREE.Mesh(avatarGeometry, material)
    //let avatarMesh = sphereMesh3

    let twig1 = Wood(0.1, 2, 0.1)
    twig1.scale.set(0.4, 0.4, 0.4)
    twig1.geometry.translate(0, 0, 1)
    twig1.rotation.set(0, 0, Math.PI / 2)
    sphereMesh2.add(twig1)

    ctx.avatar = sphereMesh3
    ctx.avatar.castShadow = true;

    ctx.avatar.add(sphereMesh1)
    ctx.avatar.add(sphereMesh2)
    //ctx.avatar.geometry.normalize()
    ctx.scene.add(ctx.avatar)
    //ctx.scene.add(sphereMesh1)
    //ctx.scene.add(sphereMesh2)
    ctx.scene.updateMatrixWorld();
    
    //let vector = new THREE.Vector3();
    //vector.setFromMatrixPosition(ctx.avatar.matrixWorld)
    //twig1.position.copy(vector)
    console.log('sphereMesh1',sphereMesh1)
    console.log('sphereMesh2',sphereMesh2)
    console.log('sphereMesh3',sphereMesh3)
    console.log(ctx)
    
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

  //let sky = new THREE.TextureLoader().load(assets.sky)
  //ctx.scene.background = sky;
  //ctx.scene.background = new THREE.Color(0x191970)
  ctx.scene.background = new THREE.Color( 0x00bfff );
  ctx.scene.fog = new THREE.FogExp2( 0x191970, 0.0025);

  createMap()

  let { 
    world, 
    ballMeshes, 
    balls, 
    boxes,
    boxMeshes,
    sphereBody 
  } = initCannon(ctx)
  
  light()
  avatar()
  generateTrees(ctx, randomPositionOnTerrain())
  generateTerrainObjects(ctx, randomPositionOnTerrain())
  generateCampfire(ctx)

  // CANNON
  
  ctx.world = world;
  ctx.sphereBody = sphereBody;

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
    
    ballMeshes.forEach((mesh, i) => {
      mesh.position.copy(balls[i].position);
      mesh.quaternion.copy(balls[i].quaternion);
    })

    boxMeshes.forEach((mesh, i) => {
      mesh.position.copy(boxes[i].position);
      mesh.quaternion.copy(boxes[i].quaternion);
    })

    ctx.avatar.position.copy(ctx.sphereBody.position)
    ctx.avatar.quaternion.copy(ctx.sphereBody.quaternion)
    let quat = ctx.avatar.quaternion.clone().conjugate()
    ctx.avatar.children[0].quaternion.copy(quat)
    ctx.avatar.children[1].quaternion.copy(quat)
    ctx.controls.update(Date.now() - start);

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
    //ctx.camera.position.setY(y + ctx.tilt)
    //ctx.camera.position.set(x, y - ctx.tilt, z + ctx.zoom)
    //ctx.camera.lookAt(x, y, z)  
    render()
  }

  ctx.init = () => {
    window.addEventListener('resize', onWindowResize, false)
    
    let pointerlockchange = function ( event ) {
      console.log(event)
      ctx.controls.enabled = true;
    }

    document.addEventListener( 'pointerlockchange', pointerlockchange, false );
    document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
    document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );
    //document.addEventListener( 'pointerlockerror', pointerlockerror, false );
    //document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
    //document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );
    
    ctx.controls = new PointerLockControls(ctx.camera, ctx.sphereBody);
  
    ctx.scene.add(ctx.controls.getObject())
    console.log(ctx)
    animate()
    window.addEventListener('keydown', function(e) {
      let position = ctx.sphereBody.position.toArray().map(p => Math.round(p))

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
    /*window.addEventListener('keydown', function(e) {
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
          ctx.sphereBody.applyForce(
            new CANNON.Vec3(0, force, 0),
            new CANNON.Vec3(...position)
          )
          break;
        case 'ArrowRight':
          position[0] += -0.2
          ctx.sphereBody.applyForce(
            new CANNON.Vec3(force, 0, 0),
            new CANNON.Vec3(...position)
          )
          break
        case 'ArrowLeft':
          //-y
          position[0] += 0.2
          ctx.sphereBody.applyForce(
            new CANNON.Vec3(force * -1, 0, 0),
            new CANNON.Vec3(...position)
          )
          break
        case 'ArrowDown':
          //+x
          position[1] += 0.2
          ctx.sphereBody.applyForce(
            new CANNON.Vec3(0, force * -1, 0),
            new CANNON.Vec3(...position)
          )
          break;
          
        case 'Space':
          position[z] += -0.2
          ctx.sphereBody.applyForce(
            new CANNON.Vec3(0, 0, 20),
            new CANNON.Vec3(...position)
          )
          break;
          
        case 'Equal':
          ctx.zoom--
          break
        case 'Minus':
          ctx.zoom++
          break
      }
    })*/
    
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