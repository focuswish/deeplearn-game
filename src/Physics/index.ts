import * as CANNON from 'cannon'
import * as THREE from 'three'
import Base from '../Base'
import {
  Box 
} from '../components/objects'
import { 
  chunk,
  get,
  isEmpty
} from 'lodash'
import Tree from '../components/Tree'
import * as uuid from 'uuid/v4'

export function spawnTrees(ctx, cannonContext) {
  let { terrain, scene } = ctx;
  let { base } = cannonContext;

  return function spawn() {
    let anchor = base.getRandomPointOnPerimeter()

    for(let i = 0; i < 10; i++) {
      let tree = Tree()
      let scale = Math.random() * (1 - 0.5) + 0.5;
      
      anchor = anchor.add(new THREE.Vector3(0, 0.5, 0))
      tree.rotation.set(Math.PI / 2, Math.PI / 2, 0)
      tree.scale.set(scale, scale, scale)
      tree.position.copy(anchor)

      base.register(tree, null, 'trees', spawn)
    }
  }
}


export function addHeightfield(ctx, cannonContext) {
  let matrix = []
  let vert = ctx.tiles[0].geometry.vertices

  let index = 0;
  
  for(let x = 0; x < Math.sqrt(vert.length); x++) {
    matrix[x] = []

    for(let y = 0; y < Math.sqrt(vert.length); y++) {
      matrix[x][y] = vert[index].z;
      index++
    }
  } 

  let heightfieldShape = new CANNON.Heightfield(matrix, {
    elementSize: 1 // Distance between the data points in X and Y directions
  })  

  let heightfieldBody = new CANNON.Body({
    mass: 0,
    material: cannonContext.physicsMaterial 
  })  
  
  let angle = (Math.PI / 2) * -1;
  let axis = new CANNON.Vec3(0, 0, 1)
  heightfieldBody.quaternion.setFromAxisAngle(axis, angle)

  heightfieldBody.position.set(-50, 50, 0)
  heightfieldBody.addShape(heightfieldShape)
  
  cannonContext.world.addBody(heightfieldBody)

  return heightfieldBody
}

function createPhysicsContactMaterial(world) {
  let physicsMaterial = new CANNON.Material('slipperyMaterial')
  
  let physicsContactMaterial = new CANNON.ContactMaterial(
    physicsMaterial,
    physicsMaterial, {
      friction: 1.0,
      restitution: 0.3,
      //contactEquationStiffness: 1e8,
      //contactEquationRelaxation: 3,
      //frictionEquationStiffness: 1e8,
      //frictionEquationRegularizationTime: 3,
  });
    
  world.addContactMaterial(physicsContactMaterial);
  
  return physicsContactMaterial
}

function createDefaultPhysicsWorld() {

  let world = new CANNON.World();
  world.allowSleep = true;
  
  world.quatNormalizeSkip = 0;
  world.quatNormalizeFast = false;
  
  let solver = new CANNON.GSSolver();

  world.defaultContactMaterial.contactEquationStiffness = 1e9;
  world.defaultContactMaterial.contactEquationRelaxation = 4;
  solver.iterations = 7;
  solver.tolerance = 0.1;
  
  let split = true;
  if(split)
    world.solver = new CANNON.SplitSolver(solver);
  else
    world.solver = solver;
  
  world.gravity.set(0,0,-20);
  world.broadphase = new CANNON.NaiveBroadphase();
  
  return world
}

function createPlayerSphere(ctx, cannonContext) {
  let bottomSnowman = ctx.scene.getObjectByName('snowman/bottom', true)
  bottomSnowman.children[0].geometry.computeBoundingSphere()
  
  let { boundingSphere } = bottomSnowman.children[0].geometry;

  return function() {
    let playerSphereShape = new CANNON.Sphere(boundingSphere.radius)
    let playerSphereBody = new CANNON.Body({ 
      mass: 1, 
      material: cannonContext.physicsMaterial 
    })
    
    playerSphereBody.addShape(playerSphereShape)
  
    playerSphereBody.position.set(0,0,5);
    playerSphereBody.linearDamping = 0.90;
    //playerSphereBody.addEventListener('collide', function(evt) {
    //});

    playerSphereBody.fixedRotation = true;

    cannonContext.world.addBody(playerSphereBody)
  
    return playerSphereBody;
  }
}

function spawnBoxes(ctx, cannonContext) {
  let {
    base
  } = cannonContext;

  return function spawn() {
    let anchor = base.getRandomPointOnPerimeter()

    //let worldDirection = ctx.camera.getWorldDirection().clone()  
    //let offset = worldDirection.clone().normalize().multiplyScalar(5)
    //let {x,y} = ctx.avatar.position.clone().add(offset)
    let geometry = new THREE.BoxGeometry(1, 1, 1)
    let { vertices } = geometry;
    vertices.forEach(vector => {
      anchor.add(vector)
      let box = Box()
      
      // CANNON
      box.body.position.copy(anchor)
      base.register(box.mesh, box.body, 'boxes', spawn)
    })   

    return cannonContext
  }
}

function createSnowball(ctx, cannonContext) {

  let snowball : any = {}

  return function(id, position, velocity) {
    snowball.shape = new CANNON.Sphere(0.15)
    snowball.geometry = new THREE.SphereGeometry(
      snowball.shape.radius, 
      32, 
      32
    )

    snowball.body = new CANNON.Body({ mass: 2 });
    setTimeout(() => snowball.body.sleep(), 5000)

    snowball.body.addShape(snowball.shape)
    snowball.material = new THREE.MeshLambertMaterial({ color: 0xffffff })
    snowball.mesh = new THREE.Mesh( 
      snowball.geometry, 
      snowball.material 
    )

    snowball.mesh.castShadow = true;
    snowball.mesh.receiveShadow = true;
    snowball.mesh.name = id
    cannonContext.base.register(snowball.mesh, snowball.body, 'snowballs')

    snowball.body.position.copy(position)
    snowball.body.velocity.copy(velocity)
    snowball.mesh.position.copy(position)
    
    return snowball;
  }
}

function createIceLance(ctx, cannonContext) {

  return function(id, position, velocity, target = null) {
    let shape = new CANNON.Sphere(0.1)
    let geometry = new THREE.ConeGeometry(shape.radius, 8 * shape.radius, 32)
   
    let body = new CANNON.Body({ mass: 1 });    
  
    body.addShape(shape)
    body.fixedRotation = true;
    body.updateMassProperties()
   
    let material = new THREE.MeshLambertMaterial({ color: 0xa5f2f3 })
    let mesh = new THREE.Mesh( 
      geometry, 
      material 
    )
    
    mesh.rotation.set(0, 0, 0)    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = id
    
    cannonContext.base.register(mesh, body, 'icelances', null, false)
    
    body.position.copy(position)
    body.velocity.copy(velocity)
    mesh.position.copy(position)

    let worldDirection = ctx.camera.getWorldDirection().clone()  
    if(target) mesh.lookAt(target)

    body.addEventListener('collide', function(evt) {
      let entity = cannonContext.base.getEntityById(id)
     
      if(entity) {
        setTimeout(() => { cannonContext.base.remove(entity) }, 1000)
      }
    })

    return { mesh, body }
  }
}

function getShootDirection(event, ctx) {

  let mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; 

   // get offset between camera and hero
  let worldDirection = ctx.camera.getWorldDirection().clone()  
  let offset = worldDirection.clone().normalize().multiplyScalar(3)

   let raycaster = new THREE.Raycaster();
   raycaster.setFromCamera(mouse, ctx.camera);
   console.log('children', ctx.scene.children.filter(child => child.name !== ''))
   let intersects = raycaster.intersectObjects(
     ctx.scene.children.filter(child => 
        child.name !== '' && 
        child.name.indexOf('halo') < 0
     ),
     true
   )

   console.log('intersects', intersects)
   
   let distance = intersects[0] && intersects[0].distance || 10

   let adjustedDirection = raycaster.ray.direction
     .clone()
     .multiplyScalar(distance)
     .sub(offset)

   let {x,y,z} = adjustedDirection

  if(!isEmpty(intersects)) {
    let intersect = intersects[0]
    z = intersect.object.position.z;
    let obj = intersect.object.parent ? 
      intersect.object.parent : intersect.object

    ctx.select(obj.clone())

    let { userData } = ctx.avatar

    if(userData.selected) {
      let selected = ctx.scene.getObjectById(userData.selected, true) 
      console.log(selected)
      if(selected) {
        //selected.remove(selected.children.find(child => child.name === 'halo'))
      }
    }

    userData.selected = obj.id

    let halo = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 32),
      new THREE.MeshBasicMaterial({opacity: 0.5, transparent: true, color: 0x0000ff})
    )
    halo.name = 'halo'
    halo.up.set(0,0,1)
   
    halo.rotateOnAxis(new THREE.Vector3(0,0,1), Math.PI/2)
    obj.add(halo)
    console.log('obj - halo',obj)
  }

  return {
    direction: adjustedDirection,
    target: get(intersects, [0, 'point'])
  }
}


export function Physics(ctx) {
  let cannonContext : any = {}
  
  let world = createDefaultPhysicsWorld()
  cannonContext.world = world;
  
  // Create a sphere
  let playerSphereBody = createPlayerSphere(ctx, cannonContext)()
  cannonContext.playerSphereBody = playerSphereBody

  let base = Base(ctx, cannonContext)
  cannonContext.base = base;
  // Create a slippery material (friction coefficient = 0.0)
  let physicsMaterial = createPhysicsContactMaterial(world)
  cannonContext.physicsMaterial = physicsMaterial;

  let heightfield = addHeightfield(ctx, cannonContext)
  
  let shootVelo = 10;
  
  cannonContext.spawnBoxes = spawnBoxes(ctx, cannonContext)
  cannonContext.spawnTrees = spawnTrees(ctx, cannonContext)
  cannonContext.createSnowball = createSnowball(ctx, cannonContext)
  cannonContext.createPlayerSphere = createPlayerSphere(ctx, cannonContext)
  cannonContext.createIceLance = createIceLance(ctx, cannonContext)

  window.addEventListener('click',function(e) {
    let {
      x, y, z
    } = playerSphereBody.position;

    let shootDirection = getShootDirection(event, ctx);
    
    let snowballVelocity = new THREE.Vector3(
      shootDirection.direction.x * shootVelo,
      shootDirection.direction.y * shootVelo,
      shootDirection.direction.z
    )
    
    let snowballId = uuid()
    let snowball = cannonContext.createIceLance(
      snowballId, 
      new THREE.Vector3()
        .copy(playerSphereBody.position)
        .setComponent(2, playerSphereBody.position.z + 1),
      snowballVelocity,
      shootDirection.target
    )
  
    ctx.ws.send(JSON.stringify({
      position: {x, y, z},
      velocity: snowball.body.velocity,
      id: snowball.mesh.name,
      timestamp: new Date().getTime() / 1000,
      type: 'snowball'
    }))
  })

  return cannonContext
}