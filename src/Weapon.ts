import * as CANNON from 'cannon';
import * as THREE from 'three';
import { sample } from 'lodash'
export default function Weapon () {}

Weapon.prototype.setTargetMaterial = function(targetMesh) {
  const getMaterial = (mesh) => {
    if(mesh.material) return mesh.material
    if(mesh.children && mesh.children.length > 0) {
      let material = undefined;
      let i = 0;
      do {
        material = getMaterial(mesh.children[i])
        i++
      } while (material === undefined && i < mesh.children.length)
      return material;
    }
    return undefined;
  }
  
  let material = getMaterial(targetMesh)
  material.color.set( 0xa5f2f3 )
}

Weapon.prototype.getParameters = function(originPosition) {
  let originMeshPosition = new THREE.Vector3(
    originPosition.x, 
    originPosition.y, 
    originPosition.z
  )

  let targetMeshPosition = this._weapon.targetMesh.position;

  let distanceToTarget = originMeshPosition.clone().distanceTo(targetMeshPosition)
  let initialWeaponPosition = originMeshPosition.addScaledVector(
    this.camera.getWorldDirection().clone(), 0.3
  )

  Object.assign(this._weapon, {
    originMeshPosition,
    targetMeshPosition,
    distanceToTarget,
    initialWeaponPosition
  })

  return this;
} 

Weapon.prototype.postRender = function() {
  return (renderer, scene, camera, geometry,
		material, group) => {
    let {
      originMeshPosition,
      targetMeshPosition,
      distanceToTarget,
      initialWeaponPosition,
      projectile,
      targetMesh
    } = this._weapon;

    let dist = projectile.position.distanceTo(targetMeshPosition)
   
    if (dist < 0.1) {
      
      this.scene.remove(projectile)
      this.weapon.setTargetMaterial.apply(this, [targetMesh])
      targetMesh.userData.health += -10;

      if (targetMesh.userData.health < 0) {

        this.scene.remove(targetMesh);
        this.UI.untarget()

      } else {
        this.UI.update(targetMesh)
        
        if(targetMesh.userData.body) {
          const body = this.cannon.world.bodies.find(body => 
            body.id === targetMesh.userData.body
          )
          if(body) {
            //body.applyImpulse(
            //  distanceToTarget,
            //  body.position
            //)
          }
        }        
      }
    } else {
      let factor = (1/dist)/2 > 1 ? 1 : (1/dist)/2
      
      projectile.position.lerp(
        targetMeshPosition, 
        factor * projectile.userData.rate
      )
      if(projectile.name === 'fireball') {
        projectile.scale.lerp(new THREE.Vector3(10,10,10), 0.01 * factor)
      }
    }
  }
}
Weapon.prototype.createIcon = function (label) {
  let mesh = this.weapon[label].apply(this)
  this.UI.registerWeapon(mesh)
}

Weapon.prototype.icelance = function () {
  let shape = new CANNON.Sphere(0.1)
  let geometry = new THREE.ConeGeometry(shape.radius, 8 * shape.radius, 32)
  let material = new THREE.MeshLambertMaterial({ color: 0xa5f2f3 })
  let icelance = new THREE.Mesh(geometry, material)
  icelance.castShadow = true;
  icelance.receiveShadow = true;
  icelance.name = 'icelance'
  icelance.userData.rate = 1;
  return icelance;
}


Weapon.prototype.fireball = function () {

  const COLORS = [
    new THREE.Color(0xFF7F50),
    new THREE.Color(0xFF6347),
    new THREE.Color(0xFF4500),	
    new THREE.Color(0xFFD700),
    new THREE.Color(0xFFA500)
  ]
  let orange = new THREE.Color(0xFFA500)
  let red = new THREE.Color(0xff0000)
  let geometry = new THREE.DodecahedronGeometry(0.3, 1)

  for (var i = 0; i < geometry.faces.length; i ++ ) {
    geometry.faces[i].color = orange.lerp(red, (1/geometry.faces.length))
  }
    
  let material = new THREE.MeshBasicMaterial({
    vertexColors: THREE.FaceColors,
    opacity: 0.9,
    transparent: true
  })

  let fireball = new THREE.Mesh(geometry, material)
  fireball.castShadow = true;
  fireball.receiveShadow = true;
  fireball.name = 'fireball'
  fireball.userData.rate = 0.3;
  console.log(fireball)
  return fireball;
}

Weapon.prototype.fire = function(label, originPosition, targetMesh) {

  this._weapon.targetMesh = targetMesh;

  let projectile = this.weapon[label]()

  this.weapon.getParameters.apply(this, [originPosition])
  
  projectile.position.copy(this._weapon.initialWeaponPosition)
  projectile.lookAt(this._weapon.targetMeshPosition)
  projectile.rotateX(Math.PI / 2)

  projectile.onAfterRender = this.weapon.postRender.apply(this)
  this._weapon.projectile = projectile;
  this.scene.add(projectile);

  return this;
};
