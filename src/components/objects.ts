import * as THREE from 'three'
import { BASE_ASSET_URL, assets } from '../constants'
import Tree from './Tree'
import {
  flatten,
  chunk
} from 'lodash'
import * as CANNON from 'cannon'

export function Wood(x = 0.1, y = 2, z = 0.2) {
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

export function Rock(radius = 0.2, detail = 0) {
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

export function Stone(x = 0.5, y = 2, z = 1) {
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

export function Box() {

  let dimensions = [0.25, 0.25, 0.25]
  
  // CANNON
  let cannonBoxShape = new CANNON.Box(new CANNON.Vec3(...dimensions))
  let body = new CANNON.Body({ mass: 5 })
  body.addShape(cannonBoxShape)

  // THREE
  let texture = new THREE.TextureLoader().load(BASE_ASSET_URL + 'crate.jpg')
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;

  let mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...dimensions.map(d => d * 2)),
    new THREE.MeshLambertMaterial({ 
      map: texture, 
      vertexColors: THREE.VertexColors 
    }) 
  )

  mesh.name = 'box'
  mesh.userData.selectable = true;
  mesh.userData.health = 100;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  return { mesh, body }
}

export function generateCrates(ctx) {

}

export function generateTerrainObjects(ctx, anchor) {
  let { scene } = ctx;
  // stone

  let anchorStone = Stone()

  anchorStone.mesh.position.set(
    ...anchor
  )

  let p = anchorStone.mesh.position;
  let n = 0;

  for(let i = 0; i < 5; i++) {
    let bottom = Stone()
    let top = Stone()
    n += 2

    bottom.mesh.position.set(p.x + n, p.y, p.z)
    top.mesh.position.set(p.x + n, p.y, p.z + 1)
    
    scene.add(bottom.mesh)
    scene.add(top.mesh)
  }

  let crown = Stone(10, 2, 0.5)

  crown.mesh.position.set(
    p.x + 6, p.y, p.z + 1.5
  )
  
  scene.add(crown.mesh)

  // wood

  for(let i = 0; i < 20; i++) {
    let woodMesh = Wood()
    woodMesh.scale.set(0.5, 0.5, 0.5)
    woodMesh.position.set(50 + (i * 0.5), 50, 0)    
    scene.add(woodMesh)
  }
}

export function generateCampfire(ctx) {
  let circle = new THREE.CircleGeometry(0.5, 10)
  let innerCircle = new THREE.CircleGeometry(0.1, 20)
  
  circle.vertices
    .filter(v => v.x !== 0 && v.y !== 0)
    .forEach((v, i) => {
      let scale = Math.random() * 0.5
      let rockMesh = Rock()

      rockMesh.position.set(55 + v.x, 55 + v.y, 0)
      rockMesh.scale.set(scale, scale, scale)
      ctx.scene.add(rockMesh)
  })

  innerCircle.vertices.forEach(v => {
    let woodMesh = Wood()
    let sign = () => Math.random() < 0.5 ? -1 : 1
    let rad = (Math.PI / 2) * Math.random() * sign()


    woodMesh.scale.set(0.2, 0.2, 0.2)
    woodMesh.position.set(55 + v.x, 55 + v.y, 0)
    woodMesh.rotation.set(rad, 0, 0)

    ctx.scene.add(woodMesh)
  })  
}