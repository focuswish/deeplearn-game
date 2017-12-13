//scene and camera setup
import * as THREE from 'three'
import * as ImprovedNoise from 'improved-noise'
import * as TrackballControls from 'three-trackballcontrols'
import * as fractal from 'fractal-terrain-generator'
import Sprite from './sprite'
import Tree from './tree';
import { sample, findIndex, flatten, chunk, take, tail} from 'lodash'

const assets = {
  ground: 'https://raw.githubusercontent.com/focuswish/deeplearn-game/master/src/assets/minecraft.jpg',
  stone: 'https://raw.githubusercontent.com/focuswish/deeplearn-game/master/src/assets/stone.jpg',
  sky: 'https://raw.githubusercontent.com/focuswish/deeplearn-game/master/src/assets/galaxy.jpg'
}

const BASE_ASSET_URL = 'https://raw.githubusercontent.com/focuswish/deeplearn-game/master/src/assets/'

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


function Terrain (params = {}) {
  let terrain : any = {
    color: 0xE1A95F, 
    asset: null, 
    flat: false,
    position: [0, 0, 0],
    altitude: null,
    ...params
  }
  
  let texture;

  if(terrain.asset) {
    texture = new THREE.TextureLoader().load(BASE_ASSET_URL + terrain.asset); 
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(64, 64);
  }

  //texture.magFilter = THREE.NearestFilter;
  //texture.minFilter = THREE.LinearMipMapLinearFilter;
  
  //terrain.material = new THREE.MeshLambertMaterial({ 
    //map: texture, 
  //  vertexColors: THREE.VertexColors 
  //}) 
  let sand = new THREE.Color(0xE1A95F)
  let dirt = new THREE.Color(0xD2B48C)
  let colorArray = sand.toArray()

  let material = new THREE.MeshStandardMaterial ({
    color: terrain.color,    
    flatShading: true,
    metalness: 0,
    vertexColors: THREE.FaceColors,
    map: texture ? texture : null
  })

  let matrix = [10, 10, 10, 10]
  let rows = matrix[2]
  let columns = matrix[3]

  let geometry = new THREE.PlaneGeometry(...matrix);  
  if(terrain.altitude) {

    let index = 0;
    
    for (let i = 0; i <= rows; i++) { 
      for (let j = 0; j <= columns; j++) { 
        let alt = terrain.altitude[index] || 0;
        geometry.vertices[index].setZ(alt)  
        index++;
      } 
    }
  }

  //terrain.geometry.faces.forEach((face, i) => {
  //  let shade = sand.lerp(dirt, Math.random() * 0.1)
  //  terrain.geometry.faces[i].color.copy(shade)
  //})

  let mesh = new THREE.Mesh(
    geometry, 
    material
  )

  //mesh.position.set(...terrain.position)
  mesh.geometry.translate(...terrain.position)
  return mesh;
}

function Rock(radius = 0.2, detail = 0) {
  let rock = {}

  let geometry = new THREE.DodecahedronGeometry(radius, detail)
  let mesh = new THREE.Mesh(
    geometry, 
    new THREE.MeshLambertMaterial({ 
      color: 0x999999,
      vertexColors: THREE.VertexColors 
    }) 
  )

  return mesh;
}

function Wood(x = 0.1, y = 2, z = 0.2) {
  let wood : any = {}

  let geometry = new THREE.BoxGeometry(x, y, z);
  
  let texture = new THREE.TextureLoader().load(BASE_ASSET_URL + 'wood.jpg');
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 10);

  let mesh = new THREE.Mesh(
    geometry, 
    new THREE.MeshLambertMaterial({ 
      map: texture, 
      vertexColors: THREE.VertexColors 
    }) 
  )

  mesh.rotation.set(Math.PI / 2, 0, 0)

  return mesh
}

function Stone(x = 0.5, y = 2, z = 1) {
  let stone : any = {}

  let geometry = new THREE.BoxGeometry(x, y, z);
  
  let texture = new THREE.TextureLoader().load(assets.stone);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  stone.mesh = new THREE.Mesh(
    geometry, 
    new THREE.MeshLambertMaterial({ 
      map: texture, 
      vertexColors: THREE.VertexColors 
    }) 
  )

  return stone;
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
  
  function getZ (x, y, log = false) {
    let { terrain: { geometry: { vertices } } } = ctx;
    
    let index = findIndex(vertices, { 
      x: Math.round(x),
      y: Math.round(y)
    })

    let z = vertices[index] ? vertices[index].z : 0
    
    if(log) {
      console.log([x, y, z])
    }

    return z;
  }

  function randomPositionOnTerrain() {
    let x = Math.round(Math.random() * 95)
    let y = Math.round(Math.random() * 95)
    let z = getZ(x, y)
    return [x, y, z]
  }

  function sphere() {
    let geometry = new THREE.SphereGeometry(0.2, 32, 32 );
    let material = new THREE.MeshLambertMaterial({ 
      color: 0x00bfff,
      flatShading: true,
      vertexColors: THREE.VertexColors 
    });
    ctx.cube = new THREE.Mesh( geometry, material );  
    ctx.cube.position.set(50, 50, 2)
    ctx.scene.add(ctx.cube) 
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

  function generateTrees() {
    let { terrain, scene } = ctx;

    for(let i = 0; i < 100; i++) {
      let tree = Tree()
      tree.rotation.set(Math.PI / 2, Math.PI / 2, 0)
      let scale = Math.random() * (1 - 0.5) + 0.5;
      tree.scale.set(scale, scale, scale)
      tree.position.set(...randomPositionOnTerrain())
      scene.add(tree)
    }
    let vert = ctx.terrain.geometry.vertices
    let square = chunk(vert, Math.sqrt(vert.length))
    let s = flatten([
      ...square[21],
      ...square[22],
      ...square[32],
      ...square[33],
      ...square[43],
      ...square[44],
      ...square[54],
      ...square[55],
      ...square[65],
      ...square[66],
    ])

    s.forEach(p => {

      let tree = Tree()
      tree.rotation.set(Math.PI / 2, Math.PI / 2, 0)
      let scale = Math.random() * (1 - 0.5) + 0.5;
      tree.scale.set(scale, scale, scale)
      tree.position.set(p.x, p.y, p.z)
      scene.add(tree)
    })
  }

  function createMap() {
    ctx.terrain.geometry = new THREE.Geometry();
    let altitude = fractal.generateTerrain(100, 100, 0.5)

    for(let i = 0; i < 10; i++) {
      for(let j = 0; j < 10; j++) {
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

    console.log(ctx)
  }

  //let sky = new THREE.TextureLoader().load(assets.sky)
  //ctx.scene.background = sky;
  ctx.scene.background = new THREE.Color(0x191970)
  //ctx.scene.background = new THREE.Color( 0xefd1b5 );
  ctx.scene.fog = new THREE.FogExp2( 0x191970, 0.0025 * 10);

  createMap()
  
  light()
  sphere()
  generateTrees()

  let anchorStone = Stone()
  anchorStone.mesh.position.set(
    ...randomPositionOnTerrain()
  )
  let p = anchorStone.mesh.position;
  let n = 0;

  for(let i = 0; i < 5; i++) {
    let bottom = Stone()
    let top = Stone()
    n += 2

    bottom.mesh.position.set(p.x + n, p.y, p.z)
    top.mesh.position.set(p.x + n, p.y, p.z + 1)
    
    ctx.scene.add(bottom.mesh)
    ctx.scene.add(top.mesh)
  }

  let crown = Stone(10, 2, 0.5)
  crown.mesh.position.set(
    p.x + 6, p.y, p.z + 1.5
  )
  ctx.scene.add(crown.mesh)

  for(let i = 0; i < 20; i++) {
    let woodMesh = Wood()
    woodMesh.scale.set(0.5, 0.5, 0.5)
    woodMesh.position.set(50 + (i * 0.5), 50, 0)    
    ctx.scene.add(woodMesh)
  }

  // Pile of rocks
  let circle = new THREE.CircleGeometry(0.5, 10)
  let innerCircle = new THREE.CircleGeometry(0.1, 20)

  let randomInRange = (min, max) => (Math.random() * (max - min + 1)) + min;
  
  circle.vertices
    .filter(v => v.x !== 0 && v.y !== 0)
    .forEach((v, i) => {
    let scale = Math.random() * 0.5
    let rockMesh = Rock()
    rockMesh.position.set(55 + v.x, 55 + v.y, 0)
    rockMesh.scale.set(scale, scale, scale)
    ctx.scene.add(rockMesh)
  })
  console.log(innerCircle)


  innerCircle.vertices.forEach(v => {
    let woodMesh = Wood()
    woodMesh.scale.set(0.2, 0.2, 0.2)
    woodMesh.position.set(55 + v.x, 55 + v.y, 0)   
    let sign = () => Math.random() < 0.5 ? -1 : 1
    let rad = (Math.PI / 2) * Math.random() * sign()
    woodMesh.rotation.set(rad, 0, 0)
    ctx.scene.add(woodMesh)
  })  
  
  function onWindowResize() {
    ctx.camera.aspect = window.innerWidth / window.innerHeight;
    ctx.camera.updateProjectionMatrix();
    ctx.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function render() {    
    ctx.renderer.render(ctx.scene, ctx.camera);
  }
  
  function animate() {
    requestAnimationFrame(animate);
    let position = ctx.cube.position
    ctx.camera.position.set(position.x, position.y - ctx.tilt, position.z + ctx.zoom)
    ctx.camera.lookAt(position.x, position.y, position.z)
    //sole.log('updating...')
    //console.log(ctx)
    //let position = ctx.cube.position
    //ctx.camera.lookAt(position.x, position.y, position.z)
    //ctx.controls.update();    
    render()
  }

  ctx.init = () => {
    window.addEventListener('resize', onWindowResize, false)
    //let controls = new TrackballControls(ctx.camera, ctx.renderer.domElement);
    //ctx.controls = controls;

    //controls.rotateSpeed = 1.0;
    //controls.zoomSpeed = 1.2;
    //controls.panSpeed = 0.8;
    
    //controls.noZoom = false;
    //controls.noPan = false;
    
   // controls.staticMoving = true;
   // controls.dynamicDampingFactor = 0.3;
    
    //controls.keys = [ 65, 83, 68 ];
    //controls.addEventListener('change', render);

    animate();
   
    window.addEventListener('keydown', function(e) {
      let vertices = ctx.terrain.geometry.vertices;
      let position = ctx.cube.position.toArray()
      let offset = 0.6
      let velocity = 1;
      let z;
      document.getElementById('info').innerHTML = `<span>${position.join(', ')}<span>`  
      console.log(e.code)

      switch (e.code) {
        case 'ArrowUp':
          
          position[1] += velocity;
          z = getZ(position[0], position[1], true)  
          console.log(z)
          position[2] = z + offset;
          ctx.cube.position.set(...position)
          break;
        case 'ArrowRight':
          position[0] += velocity;
          z = getZ(position[0], position[1], true)  
          position[2] = z + offset      
          ctx.cube.position.set(...position)
          break
        case 'ArrowLeft':
          //-y
          z = getZ(position[0], position[1], true)  
          position[0] -= velocity;
          position[2] = z + offset          
          ctx.cube.position.set(...position)
          break
        case 'ArrowDown':
          //+x
          z = getZ(position[0], position[1], true)  
          position[1] -= velocity;
          position[2] = z + offset         
          ctx.cube.position.set(...position)
        case 'Q':

          break;
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