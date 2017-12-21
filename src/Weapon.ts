import * as CANNON from 'cannon';
import * as THREE from 'three';
import Widget from './Widget'

export default function Weapon () {}

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
  let {
    originMeshPosition,
    targetMeshPosition,
    distanceToTarget,
    initialWeaponPosition,
    icelance,
    targetMesh
  } = this._weapon;

  if (icelance.position.distanceTo(targetMeshPosition) < 0.1) {
    this.scene.remove(icelance)

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
          body.applyImpulse(
            distanceToTarget,
            body.position
          )
        }
      }        
    }
  } else {
    icelance.position.lerp(targetMeshPosition, 0.2);
  }
}

Weapon.prototype.icelance = function(id, originPosition, targetMesh) {

  this._weapon.targetMesh = targetMesh;

  let shape = new CANNON.Sphere(0.1)
  let geometry = new THREE.ConeGeometry(shape.radius, 8 * shape.radius, 32)
  let material = new THREE.MeshLambertMaterial({ color: 0xa5f2f3 })
  let icelance = new THREE.Mesh(geometry, material)

  icelance.castShadow = true;
  icelance.receiveShadow = true;
  icelance.name = 'icelance'

  this.weapon.getParameters.apply(this, [originPosition])
  
  icelance.position.copy(this._weapon.initialWeaponPosition)
  icelance.lookAt(this._weapon.targetMeshPosition)
  icelance.rotateX(Math.PI / 2)

  icelance.onAfterRender = this.weapon.postRender.bind(this)
  this._weapon.icelance = icelance;
  this.scene.add(icelance);

  return { icelance };
};
