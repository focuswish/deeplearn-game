import * as CANNON from "cannon";
import * as THREE from "three";
import Widget from '../Widget'

export default function IceLance() {}

IceLance.prototype.emit = function(id, origin, targetMesh) {
  console.log(origin)
  let target = targetMesh.position;
  let originVec = new THREE.Vector3(origin.x, origin.y, origin.z)
  let direction = originVec.clone().distanceTo(target)
  let shape = new CANNON.Sphere(0.1)
  let geometry = new THREE.ConeGeometry(shape.radius, 8 * shape.radius, 32)

  let material = new THREE.MeshLambertMaterial({ color: 0xa5f2f3 })

  let mesh = new THREE.Mesh(geometry, material)

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'icelance'
  let startPosition = originVec.addScaledVector(
    this.camera.getWorldDirection().clone(), 0.3
  )

  console.log(startPosition)
  
  mesh.position.copy(startPosition)
  mesh.lookAt(target)
  mesh.rotateX(Math.PI / 2)

  mesh.onAfterRender = () => {
    if (mesh.position.distanceTo(target) < 0.1) {
      this.scene.remove(mesh)

      targetMesh.userData.health += -5;

      if (targetMesh.userData.health < 0) {

        this.scene.remove(targetMesh);
        this.UI.untarget()

      } else {
        this.UI.update(targetMesh)
        
        if(targetMesh.userData.body) {
          const body = this.world.bodies.find(body => 
            body.id === targetMesh.userData.body
          )
          if(body) {
            body.applyImpulse(
              direction,
              body.position
            )
          }
        }        
      }
    } else {
      mesh.position.lerp(target, 0.2);
    }
  };

  this.scene.add(mesh);

  return { mesh };
};
