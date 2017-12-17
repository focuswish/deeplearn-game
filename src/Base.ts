import * as CANNON from 'cannon'
import * as THREE from 'three'
import { sample, flatten, findIndex } from 'lodash'

export default function Base(ctx, cannonContext) {
  let base : any = {}

  base.store = {}
  base.cameraViewProjectionMatrix = new THREE.Matrix4();
  base.frustum = new THREE.Frustum();
  base.ctx = ctx;

  function initCache (name, respawn) {
    let { store } = base;
    
    if(!store[name]) store[name] = {}
    
    let cache = store[name]
    
    if(!cache.name) cache.name = name;
    if(!cache.entities) cache.entities = []
    if(!cache.visibleCount) cache.visibleCount = 0;
    if(!cache.respawn && respawn) cache.respawn = respawn;
   
    return cache;
  }

  function getDistanceFromAvatar(position) {
    let snowmanPosition = ctx.avatar.position;
    let distance = snowmanPosition.distanceTo(position)
    return distance;
  }

  base.getRandomPointOnPerimeter = () => {
    let avatarPerimeter = ctx.scene.getObjectByName('snowman/perimeter', true);

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

  base.register = (mesh, body, name = null, respawn = null) => {
    let { store } = base;
    
    // add to THREE
    ctx.scene.add(mesh)

    // add to CANNON
    if(body) cannonContext.world.addBody(body)

    if(!name) return store;
    
    let cache = initCache(name, respawn)

    cache.entities.push({body, mesh, name})

    return store;
  }

  base.removeMesh = (mesh) => {
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
    //if(ctx.scene.getObjectById (mesh.id)) ctx.scene.remove(mesh)
    ctx.scene.remove(mesh)

    return
  }

  base.remove = (entity) => {
    //let name = entity.name;
    let cache = base.store[entity.name];

    let { mesh, body } = entity;

    base.removeMesh(mesh)

    if(body) cannonContext.world.remove(body)
    
    let index = findIndex(cache.entities, entity)
    if(index > -1) {
      cache.entities.splice(index, 1)
    }
  }
  
  base.removeMeshesByName = (name) => {

    let cache = base.store[name]
    
    if(!cache) return base;

    let { entities } = cache;

    entities.forEach((entity, i) => { 
      base.remove(entity)
    })

    //delete base.store[name]
    cache.visibleCount = 0;
    cache.entities = []

    return base;
  }

  base.sync = (name) => {
    if(!base.store[name]) return base

    let { entities } = base.store[name];
    
    entities.forEach((entity, i) => {
      if(entity.body) {
        entity.mesh.position.copy(entity.body.position)
        entity.mesh.quaternion.copy(entity.body.quaternion)
      }
    })

    return base;
  }

  base.get = (name) => {
    if(!base.store[name]) return []

    return base.store[name];
  }

  base.cullDistantObjects = (entities) => {

    let horizon = entities.map((entity, i) => ({
      distance: getDistanceFromAvatar(entity.mesh.position),
      ...entity
    })).sort((a,b) => a.distance - b.distance)
    
    if(!horizon) return

    horizon.slice(0, 10).forEach(entity => {
       base.remove(entity)
    })
  }
  
  base.tick = () => {
    let { store, frustum } = base;
    
    setTimeout(() => {
      let player = cannonContext.playerSphereBody;
      let key = ctx.avatar.name;

      let wsData = {
        position: ctx.data[key].body.position,
        velocity: ctx.data[key].body.velocity,
        didSpawn: ctx.data[key].didSpawn,
        id: ctx.data[key].id,
        timestamp: new Date().getTime() / 1000,
        type: 'player'
      }
      ctx.ws.send(JSON.stringify(wsData))

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
          
          if(cache.entities.length > 10) {
            base.cullDistantObjects(cache.entities)
          }
          
          if(visibleCount < 1) {    
            if(cache.respawn) {
              if(cache.entities.length > 40) base.removeMeshesByName(key)
              cache.respawn()
            }
          }
        })
      }
      
      base.tick()

    }, 500)
  }


  base.apply = (ctx) => {
    base.ctx = ctx;

    return base;
  }

  base.update = () => {
    let { 
      cameraViewProjectionMatrix,
      frustum 
    } = base;
    let { camera } = ctx; 
    
    camera.updateMatrixWorld(); // make sure the camera matrix is updated
    camera.matrixWorldInverse.getInverse( ctx.camera.matrixWorld );
    
    cameraViewProjectionMatrix.multiplyMatrices( 
      camera.projectionMatrix, 
      camera.matrixWorldInverse 
    );

    frustum.setFromMatrix(cameraViewProjectionMatrix);
  }

  return base;
}
