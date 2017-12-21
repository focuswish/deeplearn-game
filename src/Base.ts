import * as CANNON from 'cannon'
import * as THREE from 'three'
import { sample, flatten, findIndex, has, isEmpty } from 'lodash'

export default function Base() {}

Base.prototype.init = function(name, respawn) {
  let { store } = this._base;
  
  if(!store[name]) store[name] = {}
  
  let cache = store[name]
  
  if(!cache.name) cache.name = name;
  if(!cache.entities) cache.entities = []
  if(!cache.visibleCount) cache.visibleCount = 0;
  if(!cache.respawn && respawn) cache.respawn = respawn;
 
  return cache;
}


Base.prototype.getRandomPointOnPerimeter = function() {
  let avatarPerimeter = this.scene.getObjectByName('snowman/halo', true);

  if(!avatarPerimeter) {
    return new THREE.Vector3(0, 0, 1)
  }

  let pointOnPerimeter = sample(avatarPerimeter.geometry.vertices).clone()
  let vector = avatarPerimeter
    .getWorldPosition()
    .add(pointOnPerimeter)
    .add(new THREE.Vector3(0, 0, -0.2))

  return vector
}


Base.prototype.register = function(
  mesh, 
  body, 
  name = null, 
  respawn = null, 
  copyQuaternion = true
) {
    let { store } = this._base;
    
    // add to THREE
    this.scene.add(mesh)

    // add to CANNON
    if(body) {
      mesh.userData.body = body.id
      this.world.addBody(body)
    }

    if(!name) return store;
    
    let cache = this.base.init.apply(this, [name, respawn])
    
    cache.entities.push({body, mesh, name, copyQuaternion})
    
    return this;
}

Base.prototype.registerMesh = function(mesh) {
  this.scene.add(mesh)
}

Base.prototype.removeMesh = function (mesh) {
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

Base.prototype.remove = function (entity) {
  let cache = this._base.store[entity.name];

  let { mesh, body } = entity;

  this.base.removeMesh.apply(this, [mesh])

  if(body) this.world.remove(body)
    
  let index = findIndex(cache.entities, entity)
  if(index > -1) {
    cache.entities.splice(index, 1)
  }
}
  
Base.prototype.removeMeshesByName = function(name) {
  let cache = this._base.store[name]
  
  if(!cache) return

  let { entities } = cache;

  entities.forEach((entity, i) => { 
    this.base.remove.apply(this, [entity])
  })

  cache.visibleCount = 0;
  cache.entities = []

  return this;
}

Base.prototype.sync = function (name) {
  if(!this._base.store[name]) return this;

  let { entities } = this._base.store[name];
    
  entities.forEach((entity, i) => {
    if(entity.body) {
      entity.mesh.position.copy(entity.body.position)
      if(entity.copyQuaternion) entity.mesh.quaternion.copy(entity.body.quaternion)
    }
  })

  return this;
}

Base.prototype.get = (name) => {
  if(!this._base.store[name]) return []

  return this._base.store[name];
}

Base.prototype.getNearby = function () {
  return this._base.nearby
}

Base.prototype.getEntityById = function (id) {
  let needle;

  Object.keys(this._base.store).forEach(key => {
    let entities = this._base.store[key].entities;
    Object.keys(entities).forEach(key => {
      if(entities[key].mesh.name === id) {
        needle = entities[key];
      }
    })
  })
    
  return needle;
}

Base.prototype.getNearbyObjects = function () {
  let objects = this.scene.children
    .filter(child => 
      child.userData && 
      child.userData.selectable &&
      child.id !== this.avatar.id
    ).map(object => ({
      object, 
      distance: this.avatar.position.distanceTo(object.position)
    }))
    .sort((a, b) => a.distance - b.distance)

  this._base.nearby = objects;

  return this;
}

Base.prototype.cullDistantObjects = function () {
  let farAway = this._base.nearby.reverse()

  farAway.slice(0, 10).forEach(entity => {
    this.base.remove(this, [entity])
  })
}

Base.prototype.tick = function () {
  let { store, frustum } = this._base;
    
  setTimeout(() => {
    this.base.getNearbyObjects.apply(this)

    let player = this.playerSphereBody;
    let key = this.avatar.userData.id;

    let wsData = {
      position: this.data[key].body.position,
      velocity: this.data[key].body.velocity,
      didSpawn: this.data[key].didSpawn,
      id: key,
      timestamp: new Date().getTime() / 1000,
      type: 'player',
      userName: this.avatar.userData.name
    }
    
    this.ws.send(JSON.stringify(wsData))

    if(Object.keys(store).length > 0) {
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
          //base.cullDistantObjects(cache.entities)
        }
          
        if(visibleCount < 1) {    
          if(cache.respawn) {
            if(cache.entities.length > 100) this.removeMeshesByName(key)
            cache.respawn()
          }
        }
      })
    }
    this.base.tick.apply(this)
    }, 1000)
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
  const objects = this.scene.children;
  return objects.find(o => o.userData && o.userData.id === id)
}

Base.prototype.getEntityByMesh = function(mesh) {
  const { store } = this._base
  Object.keys(store).map(key => {
    let entities = store[key]

    entities.forEach(entity => {
      
    })
  })
}

