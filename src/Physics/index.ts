import * as CANNON from 'cannon'
import * as THREE from 'three'
import Base from '../Base'
import {
  Box 
} from '../components/objects'
import { 
  chunk
} from 'lodash'
import Tree from '../components/Tree'

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
    physicsMaterial,
    0.0, // friction coefficient
    0.3  // restitution
  );
    
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

function createPlayerSphere(cannonContext, { radius }) {
   // Create a sphere
  let playerSphereShape = new CANNON.Sphere(radius)
  let playerSphereBody = new CANNON.Body({ mass: 1, material: cannonContext.physicsMaterial })
  
  playerSphereBody.addShape(playerSphereShape)

  playerSphereBody.position.set(0,0,5);
  playerSphereBody.linearDamping = 0.9;

  cannonContext.world.addBody(playerSphereBody)
  cannonContext.playerSphereBody = playerSphereBody

  return playerSphereBody;
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

  
  //cannonContext.world.addBody(snowball.body);
  //ctx.scene.add(snowball.mesh);
  cannonContext.base.register(snowball.mesh, snowball.body, 'snowballs')

  return snowball;
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
   let intersects = raycaster.intersectObjects(ctx.scene.children);
   
   let distance = intersects[0] && intersects[0].distance || 10

   let adjustedDirection = raycaster.ray.direction
     .clone()
     .multiplyScalar(distance)
     .sub(offset)

   let {x,y,z} = adjustedDirection

   if(intersects && intersects.length > 0) {
     let intersect = intersects[0]
     if(intersect.object.name === 'box') {
       intersect.object.material.color.set(0xff0000)      
     }
   }

   z = z/Math.pow(10, 2)
   return {x, y, z}
 }


export function Physics(ctx) {
  let cannonContext : any = {}
  
  let world = createDefaultPhysicsWorld()
  cannonContext.world = world;
  
  // Create a sphere
  let bottomSnowman = ctx.scene.getObjectByName('snowman/bottom', true)
  bottomSnowman.children[0].geometry.computeBoundingSphere()
  
  let { boundingSphere } = bottomSnowman.children[0].geometry;
  let playerSphereBody = createPlayerSphere(cannonContext, boundingSphere)

  let base = Base(ctx, cannonContext)
  cannonContext.base = base;
  // Create a slippery material (friction coefficient = 0.0)
  let physicsMaterial = createPhysicsContactMaterial(world)
  cannonContext.physicsMaterial = physicsMaterial;

  let heightfield = addHeightfield(ctx, cannonContext)

  
  let shootVelo = 10;
  
  cannonContext.spawnBoxes = spawnBoxes(ctx, cannonContext)
  cannonContext.spawnTrees = spawnTrees(ctx, cannonContext)

  window.addEventListener('click',function(e) {
    let {
      x, y, z
    } = playerSphereBody.position;
    let snowball = createSnowball(ctx, cannonContext)

    let shootDirection = getShootDirection(event, ctx);
    
    snowball.body.velocity.set(  
      shootDirection.x * shootVelo,
      shootDirection.y * shootVelo,
      shootDirection.z
    )

    snowball.body.position.set(x,y,z);
    snowball.mesh.position.set(x,y,z);
  })

  return cannonContext
}