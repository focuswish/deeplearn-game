import * as CANNON from 'cannon'
import * as THREE from 'three'
import {
  Wood
} from './objects'

export default function Avatar(id) {
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

  topSnowmanMesh.geometry.translate(0, 0, 0.80)
  middleSnowmanMesh.geometry.translate(0, 0, 0.50)

  let topSnowman = new THREE.Object3D()
  topSnowman.name = 'snowman/top'
  topSnowman.add(topSnowmanMesh)

  let middleSnowman = new THREE.Object3D()
  middleSnowman.name = 'snowman/middle'
  middleSnowman.add(middleSnowmanMesh)

  let bottomSnowman = new THREE.Object3D()
  bottomSnowman.name = 'snowman/bottom'
  bottomSnowman.add(bottomSnowmanMesh)

  let snowmanHalo = new THREE.Mesh(
    new THREE.CircleGeometry(10, 32),
    new THREE.MeshBasicMaterial({opacity: 0.4, transparent: true})
  )
  
  snowmanHalo.name = 'snowman/perimeter'
  //snowmanHalo.geometry.translate(0, 0, -0.5)
  middleSnowman.add(snowmanHalo)

  let twig1 = Wood(0.1, 2, 0.1)
  twig1.scale.set(0.4, 0.4, 0.4)
  twig1.geometry.translate(0, 0, 1)
  twig1.rotation.set(0, 0, Math.PI / 2)
  
  middleSnowman.add(twig1)

  let avatar = new THREE.Group()

  avatar.name = id
  avatar.userData.type = 'player'
  
  avatar.add(bottomSnowman)
  avatar.add(middleSnowman)
  avatar.add(topSnowman)
  avatar.castShadow = true;
  avatar.scale.set(0.8, 0.8, 0.8)

  return avatar;
}