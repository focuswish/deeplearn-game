import * as CANNON from 'cannon'
import * as THREE from 'three'
import { sample, flatten, findIndex, has, isEmpty } from 'lodash'
import Sprite from './Sprite'

export default function Base() {}

Base.prototype.getRandomPointOnPerimeter = function() {
  let avatarPerimeter = this.scene.getObjectByName('snowman/halo', true);

  if(!avatarPerimeter) {
    return new THREE.Vector3(0, 0, 1)
  }

  let pointOnPerimeter = sample(avatarPerimeter.geometry.vertices).clone()
  let vector = avatarPerimeter
    .getWorldPosition()
    .add(pointOnPerimeter)
    

  vector.setZ(this.base.getZ.apply(this, [vector.x, vector.y]))

  return vector
}


Base.prototype.register = function(
  mesh, 
  body, 
  name = null, 
  respawn = null, 
  copyQuaternion = true
) {    
    // add to THREE
    this.scene.add(mesh)

    // add to CANNON
    if(body) {
      mesh.userData.body = body.id
      this.cannon.world.addBody(body)
    }

    return this;
}

Base.prototype.removeMesh = function (mesh) {
  console.log(`Removing mesh ${mesh.name} with distance ${mesh.userData.distance}`)

  if(mesh.userData.body) {
    let body = this.base.getCannonBodyById.apply(this, [mesh.userData.body]);
    if(body) this.cannon.world.remove(body)
  }

  function removeAssociatedObjects(child) {
      if(child.geometry) child.geometry.dispose()
      
      if(child.material) {
        child.material.dispose()
        if(child.material.texture) {
          child.material.texture.dispose()
        }
      }
    }

    if(mesh.children && mesh.children.length > 0) {
      mesh.children.forEach(child => {
        removeAssociatedObjects(child)
      })
    }

  removeAssociatedObjects(mesh)
  this.scene.remove(mesh)
  
  return this;
}
  
Base.prototype.removeMeshesByName = function(name) {
  let meshes = this.base.getObjectsByName.apply(this, [name])

  meshes.forEach(mesh => {
    this.base.removeMesh.apply(this, [mesh])    
  })

  return this;
}

Base.prototype.getObjectsByName = function(name) {
  return this.scene.children.filter(child => 
    child.name === name
  )
}

Base.prototype.getCannonBodyById = function(id) {
  return this.cannon.world.bodies.find(body => 
    body.id === id
  )
}

Base.prototype.sync = function (name) {
  let meshes = this.base.getObjectsByName.apply(this, [name])

  meshes.forEach(mesh => {
    if(mesh.userData.body) {
      let body = this.base.getCannonBodyById.apply(this, [mesh.userData.body])
      if(body) {
        mesh.position.copy(body.position)
        mesh.quaternion.copy(body.quaternion)
      }
    }
  })

  return this;
}

Base.prototype.getNearby = function () {
  return this._base.nearby
}

Base.prototype.getProximateMeshes = function () {
  let objects = this.scene.children
    .filter(child => 
      child.userData && 
      child.userData.selectable &&
      child.id !== this.avatar.id
    ).map(child => Object.assign(child, {
        userData: {
          ...child.userData,
          distance: this.avatar.position.distanceTo(child.position)
        }
      })
    ).sort((a, b) => a.userData.distance - b.userData.distance)

  this._base.nearby = objects;

  return this;
}

Base.prototype.cullDistantObjects = function (count = 10) {
  let distantMeshes = this._base.nearby.reverse().filter(mesh => 
    mesh.userData.type !== 'player'
  )

  distantMeshes.slice(0, count).forEach(mesh => {
    this.base.removeMesh.apply(this, [mesh])
  })
}

Base.prototype.tick = function () {
  console.log('tick')
  let { frustum } = this._base;
    
  this.base.getProximateMeshes.apply(this)
  let hero = this.scene.getObjectById(this.avatar.id)

  this.socket.send.apply(this, [{
    position: hero.position,
    velocity: hero.velocity,
    timestamp: new Date().getTime() / 1000,
    type: 'player',
  }])
  
  if(this.scene.children.length > 100) {
    this.base.cullDistantObjects.apply(this)
  }

  let distantMeshes = this._base.nearby.filter(mesh => 
    mesh.userData.distance && mesh.userData.distance > 30
  )

  if(distantMeshes) {
    distantMeshes.forEach(mesh => {
      this.base.removeMesh.apply(this, [mesh])
    })
  }

  if(!this._base.nearby || this._base.nearby.length < 20) {
    this.physics.spawnBoxes.apply(this)
    this.physics.spawnTrees.apply(this)
  }

  /*if(Object.keys(store).length > 0) {
    Object.keys(store).forEach(key => {
    let cache = store[key]

    let intersects = cache.entities.map(entity => {
      return frustum.intersectsObject(entity.mesh.type === 'Mesh' ? 
        entity.mesh : entity.mesh.children[0]
      )
     }).filter(visible => visible)
          
    let visibleCount = intersects.length;
    store[key].visibleCount = visibleCount;
          
    if(cache.entities.length > 100) {
      this.base.cullDistantObjects.apply(this, [cache.entities])
    }
          
    if(visibleCount < 1) {    
      if(cache.respawn) {
        if(cache.entities.length > 100) this.removeMeshesByName(key)
          cache.respawn()
        }
      }
    })
  }*/
}


Base.prototype.update = function () {
  let { 
    cameraViewProjectionMatrix,
    frustum 
  } = this._base;
  
  let { camera } = this;
    
  camera.updateMatrixWorld(); // make sure the camera matrix is updated
  camera.matrixWorldInverse.getInverse( this.camera.matrixWorld );
    
  cameraViewProjectionMatrix.multiplyMatrices( 
    camera.projectionMatrix, 
    camera.matrixWorldInverse 
  );

  frustum.setFromMatrix(cameraViewProjectionMatrix);
}

Base.prototype.getPlayerById = function(id) {
  return this.scene.children.find(o => o.userData && o.userData.id === id)
}

Base.prototype.getHeroTargetMesh = function() {
  return this.avatar.userData.target ? this.scene.getObjectById(this.avatar.userData.target) : null
}

Base.prototype.getZ = function(x, y) {
  let { terrain: { geometry: { vertices } } } = this;
    
  let index = findIndex(vertices, { 
    x: Math.round(x),
    y: Math.round(y)
  })

  return vertices[index] ? vertices[index].z : 0
}
