import * as CANNON from 'cannon'
import * as THREE from 'three'
import {
  Wood
} from './objects'

function addPlayerName(font, textContent) {
  let size = 4;

  let textGeometry = new THREE.TextGeometry(textContent, {
    font: font,
    size: size,
		height: size / 16,
		curveSegments: 12,
  })

  let textMesh = new THREE.Mesh(
    textGeometry,
    new THREE.MeshBasicMaterial({opacity: 0.90, transparent: true, color: 0xff0000})
  )
  
  textMesh.rotation.set(Math.PI / 2, 0, 0)
  textMesh.geometry.scale(0.05, 0.05, 0.05)
  textMesh.geometry.center()
  textMesh.geometry.translate(0, 1.25, 0)
  return textMesh
}

export default function Avatar(id, userName, font) {
  let material = new THREE.MeshLambertMaterial({ 
    color: 0xfffafa,
    flatShading: true,
    vertexColors: THREE.VertexColors 
  });

  let bottom = 0.60;
  let middle = 0.45;
  let top = 0.35;
  
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
  
  //snowmanHalo.name = 'snowman/halo'
  //snowmanHalo.visible = false;
  //snowmanHalo.geometry.translate(0,0,1)
  //middleSnowman.add(snowmanHalo)

  let twig1 = Wood(0.1, 2, 0.1)
  twig1.scale.set(0.4, 0.4, 0.4)
  twig1.geometry.translate(0, 0, 1.25)
  twig1.rotation.set(0, 0, Math.PI / 2)
  
  let text = addPlayerName(font, userName)

  middleSnowman.add(twig1)
  middleSnowman.add(text)
  let avatar = new THREE.Group()

  avatar.name = 'snowman'
  avatar.userData.type = 'player'
  avatar.userData.health = 100;
  avatar.userData.id = id;
  avatar.userData.selectable = true
  avatar.userData.isPlayer = true;
  avatar.userData.name = userName;

  avatar.add(bottomSnowman)
  avatar.add(middleSnowman)
  avatar.add(topSnowman)

  avatar.castShadow = true;
  avatar.scale.set(0.8, 0.8, 0.7)

  return avatar;
}