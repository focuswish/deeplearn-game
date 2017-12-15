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

    let bottom = 0.60;
    let middle = 0.40;
    let top = 0.25;
    
    let topSnowmanMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(top/2, 1), 
      material
    )
  
    let middleSnowmanMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(middle/2, 1),
      material
    )

    let bottomSnowmanMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(bottom/2, 1),
      material
    )

    topSnowmanMesh.name = 'top_snowman_mesh'
    middleSnowmanMesh.name = 'middle_snowman_mesh'
    bottomSnowmanMesh.name = 'bottom_snowman_mesh'
  
    topSnowmanMesh.geometry.translate(0, 0, 0.80)
    middleSnowmanMesh.geometry.translate(0, 0, 0.50)
  
    let topSnowman = new THREE.Object3D()
    topSnowman.add(topSnowmanMesh)

    let middleSnowman = new THREE.Object3D()
    middleSnowman.add(middleSnowmanMesh)

    let bottomSnowman = new THREE.Object3D()
    bottomSnowman.add(bottomSnowmanMesh)

    let twig1 = Wood(0.1, 2, 0.1)
    twig1.scale.set(0.4, 0.4, 0.4)
    twig1.geometry.translate(0, 0, 1)
    twig1.rotation.set(0, 0, Math.PI / 2)
    
    middleSnowman.add(twig1)

    ctx.avatar = new THREE.Group()

    ctx.avatar.add(bottomSnowman)
    ctx.avatar.add(middleSnowman)
    ctx.avatar.add(topSnowman)
    ctx.avatar.castShadow = true;

    ctx.scene.add(ctx.avatar)
    ctx.scene.updateMatrixWorld();
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

  //ctx.scene.background = new THREE.Color( 0x00bfff );
  ctx.scene.background = new THREE.Color(0x191970)
  ctx.scene.fog = new THREE.FogExp2( 0x000000, 0.0025 * 20);

  createMap()

  let { 
    world, 
    ballMeshes, 
    balls, 
    boxes,
    sphereBody,
    boxMeshGroup,
    createBoxMeshGroup
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
      if(balls[i].sleepState === 2) {
        console.log('Removing mesh...')
        mesh.geometry.dispose()
        mesh.material.dispose()
        ctx.scene.remove(mesh)
        ballMeshes.splice(i, 1)
        balls.splice(i, 1)
      } else {
        mesh.position.copy(balls[i].position);
        mesh.quaternion.copy(balls[i].quaternion);
      }
    })

    boxMeshGroup.children.forEach((mesh, i) => {
      mesh.position.copy(boxes[i].position);
      mesh.quaternion.copy(boxes[i].quaternion);
    })

    ctx.avatar.position.copy(ctx.sphereBody.position)
    ctx.avatar.children[0].quaternion.copy(ctx.sphereBody.quaternion)
  
    ctx.controls.update(Date.now() - start);

    ctx.frustum = new THREE.Frustum();
    let cameraViewProjectionMatrix = new THREE.Matrix4();
    
    // every time the camera or objects change position (or every frame)

    ctx.camera.updateMatrixWorld(); // make sure the camera matrix is updated
    ctx.camera.matrixWorldInverse.getInverse( ctx.camera.matrixWorld );
    
    cameraViewProjectionMatrix.multiplyMatrices( 
      ctx.camera.projectionMatrix, 
      ctx.camera.matrixWorldInverse 
    );
    ctx.frustum.setFromMatrix( cameraViewProjectionMatrix );
    
    // frustum is now ready to check all the objects you need
  
    start = Date.now() 
  }

  function tick() {
    setTimeout(function() {
      console.log(boxMeshGroup)
      if(boxMeshGroup.children) {
        let int = boxMeshGroup.children
          .map(mesh => ctx.frustum.intersectsObject(mesh))
          .filter(visible => visible)

        console.log(int)
        if(!int || int.length < 2) {
          createBoxMeshGroup()
        }
      } else {
        createBoxMeshGroup()
      }
  
      tick()
    }, 2000)
  }
  tick()

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
    
    ctx.controls = new PointerLockControls(ctx.camera, ctx.sphereBody, ctx.avatar);
  
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