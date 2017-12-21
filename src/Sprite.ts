import * as THREE from 'three'

export default function Sprite (geometry, material) {
  this.mesh = new THREE.Mesh(
    geometry, 
    material
  )
  this.mesh.name = name
  this.mesh.castShadow = true;
  this.mesh.receiveShadow = true;
}


Sprite.prototype.set = function(props = {}) {
  this.mesh.userData = {
    ...this.mesh.userData,
    selectable: true,
    health: 100,
    maxHealth: 100,
    ...props,
  }

  return this;
}

Sprite.prototype.update = function(mesh, data) {
  mesh.userData = {
    ...mesh.userData,
    ...data
  }

  if(mesh.userData.heatlth && 
    mesh.userData.health <= 0
  ) {
   //ctx.scene.remove(mesh) 
  }
   
  //let { selected } = ctx.avatar.userData;

  //if(selected && 
  //  selected === mesh.id
  //) {
    //

}
