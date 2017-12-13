//scene and camera setup
import * as THREE from 'three'
import * as ImprovedNoise from 'improved-noise'
import * as TrackballControls from 'three-trackballcontrols'
import * as fractal from 'fractal-terrain-generator'
import Sprite from './sprite'
import Tree from './tree';
import { sample, findIndex } from 'lodash'

const assets = {
  ground: 'https://raw.githubusercontent.com/focuswish/deeplearn-game/master/src/assets/minecraft.jpg',
  stone: 'https://raw.githubusercontent.com/focuswish/deeplearn-game/master/src/assets/stone.jpg',
  sky: 'https://raw.githubusercontent.com/focuswish/deeplearn-game/master/src/assets/galaxy.jpg'
}

function Terrain () {
  let terrain : any = {}
  
  //let texture = new THREE.TextureLoader().load(assets.ground); 
  //texture.wrapS = THREE.RepeatWrapping;
  //texture.wrapT = THREE.RepeatWrapping;
  //texture.repeat.set(64, 64);
  //texture.magFilter = THREE.NearestFilter;
  //texture.minFilter = THREE.LinearMipMapLinearFilter;
  
  //terrain.material = new THREE.MeshLambertMaterial({ 
    //map: texture, 
  //  vertexColors: THREE.VertexColors 
  //}) 
  let sand = new THREE.Color(0xE1A95F)
  let dirt = new THREE.Color(0xD2B48C)
  let colorArray = sand.toArray()

  terrain.material = new THREE.MeshStandardMaterial ({
    color: 0xE1A95F,    
    flatShading: true,
    metalness: 0,
    vertexColors: THREE.FaceColors
  })

  let matrix = [10, 10, 64, 64]
  let rows = matrix[2]
  let columns = matrix[3]

  terrain.geometry = new THREE.PlaneGeometry(...matrix);  

  let index = 0;
  let altitude = fractal.generateTerrain(rows, columns, 1)

  for (let i = 0; i <= rows; i++) { 
    for (let j = 0; j <= columns; j++) { 
      terrain.geometry.vertices[index].setZ(altitude[j][i])      
      index++;
    }
  }

  //terrain.geometry.faces.forEach((face, i) => {
  //  let shade = sand.lerp(dirt, Math.random() * 0.1)
  //  terrain.geometry.faces[i].color.copy(shade)
  //})

  terrain.mesh = new THREE.Mesh(
    terrain.geometry, 
    terrain.material
  )
  terrain.matrix = matrix;

  return terrain;
}

function Stone() {
  let stone : any = {}

  let geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
  
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
  ctx.scene = new THREE.Scene()
  ctx.camera = new THREE.PerspectiveCamera(
    75, 
    window.innerWidth / window.innerHeight, 
    1, 
    1000
  );  
  ctx.renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('canvas')
  })

  ctx.renderer.setPixelRatio( window.devicePixelRatio );
  ctx.renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(ctx.renderer.domElement);

  ctx.zoom = 2;
  ctx.tilt = 2;
  ctx.camera.position.x = 0;
  ctx.camera.position.y = 0;
  ctx.camera.position.z = ctx.zoom
  //ctx.camera.rotation.x = Math.PI / 2
  ctx.camera.lookAt(0, 0, 0);
  ctx.camera.up.set(0, 0, 1);
  
  function randomPositionOnTerrain() {
    let random = sample(ctx.terrain.geometry.vertices)
    return [random.x, random.y, random.z]
  }

  function cube() {
    let geometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 );
    let material = new THREE.MeshBasicMaterial({
      color: 0x999999
    })
 
    ctx.cube = new THREE.Mesh(geometry, material);
    let vertices = ctx.terrain.geometry.vertices
    let vertex = vertices[(vertices.length - 1)/2]
    ctx.cube.position.set(vertex.x, vertex.y, vertex.z)
    ctx.scene.add(ctx.cube)

    
  }

  function light() {
    let light = new THREE.HemisphereLight(0xfffafa,0x000000, .9)
    let sun = new THREE.DirectionalLight( 0xcdc1c5, 0.9);
    sun.position.set(-10, -10, 10)
    sun.castShadow = true;

    ctx.scene.add(light)
    ctx.scene.add(sun)

    return ctx;
  }

  function generateTrees() {
    let { terrain } = ctx;

    for(let i = 0; i < 50; i++) {
      let tree = Tree()
      tree.rotation.set(Math.PI / 2, Math.PI / 2, 0)
      let scale = Math.random() * (1 - 0.5) + 0.5;
      tree.scale.set(scale, scale, scale)
      tree.position.set(...randomPositionOnTerrain())
      ctx.scene.add(tree)
    }
  }
  let sky = new THREE.TextureLoader().load(assets.sky)
  ctx.scene.background = sky;
  //ctx.scene.background = new THREE.Color(0x00bfff)
  ctx.scene.fog = new THREE.FogExp2(0xefd1b5, 0.001)
  ctx.terrain = Terrain()
  let terrain2 = ctx.terrain.mesh.clone()
  terrain2.geometry.translate(640, 0, 0)

  //let terrain2 = Terrain()
  //terrain2.mesh.geometry.translate(64 * 10, 0, 0)
  //console.log(terrain2)
  ctx.scene.add(ctx.terrain.mesh)
  ctx.scene.add(terrain2)
  console.log(terrain2)
  //ctx.scene.add(terrain2.mesh)

  light()

  cube()
  generateTrees()

  for(let i = 0; i < 10; i++) {
    let stone1 = Stone()
    let stone2 = Stone()
    let stone3 = Stone()

    stone1.mesh.position.set(...randomPositionOnTerrain())
    let p = stone1.mesh.position;

    stone2.mesh.position.set(p.x, p.y, p.z + 0.4)
    stone3.mesh.position.set(p.x, p.y, p.z + 0.2)
    ctx.scene.add(stone1.mesh)
    ctx.scene.add(stone2.mesh)
    ctx.scene.add(stone3.mesh)
  }


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
    ctx.camera.position.set(position.x + ctx.tilt, position.y, position.z + ctx.zoom)
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
      let position = ctx.cube.position
      let i = findIndex(vertices, {...position})
      
      console.log(e.code)

      let vertex;
      switch (e.code) {
        case 'ArrowUp':
          vertex = vertices[i - 1]
          position.set(vertex.x, vertex.y, vertex.z)
          break;
        case 'ArrowRight':
          vertex = vertices[i - ctx.terrain.matrix[3] - 1]
          position.set(vertex.x, vertex.y, vertex.z)
          break
        case 'ArrowLeft':
          //-y
          vertex = vertices[i + ctx.terrain.matrix[3] + 1]
          position.set(vertex.x, vertex.y, vertex.z)
          break
        case 'ArrowDown':
          //-x
          vertex = vertices[i + 1]
          position.set(vertex.x, vertex.y, vertex.z)
          break;
        case 'Equal':
          ctx.zoom--
          console.log(ctx)
          break
        case 'Minus':
          ctx.zoom++
          console.log(ctx)
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