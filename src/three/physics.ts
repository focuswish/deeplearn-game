import * as CANNON from 'cannon'
import * as THREE from 'three'
import {
  Box 
} from './objects'
import { 
  chunk
} from 'lodash'

export function initCannon(ctx) {
  let world = new CANNON.World();

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
  
  //world.addBody(body)
  
  let matrix = []
  let vert = ctx.tiles[0].geometry.vertices
  console.log('vert', vert)
  let index = 0;
  
  for(let x = 0; x < Math.sqrt(vert.length); x++) {
    matrix[x] = []

    for(let y = 0; y < Math.sqrt(vert.length); y++) {
      matrix[x][y] = vert[index].z
      index++
    }
  } 

  // Create a slippery material (friction coefficient = 0.0)
  let physicsMaterial = new CANNON.Material('slipperyMaterial')

  let physicsContactMaterial = new CANNON.ContactMaterial(
     physicsMaterial,
     physicsMaterial,
     0.0, // friction coefficient
     0.3  // restitution
  );
  
  world.addContactMaterial(physicsContactMaterial);

  //cylinder

  let cylinderShape = new CANNON.Cylinder (0.6, 0.6, 1, 8)
  //let cylinderBody = new CANNON.Body({
  //  mass: 0,
  //  material: physicsMaterial
  //})

  // Create a sphere
  let sphereShape = new CANNON.Sphere(1)
  let sphereBody = new CANNON.Body({ mass: 1, material: physicsMaterial });
  
  sphereBody.addShape(sphereShape)
  //sphereBody.addShape(cylinderShape)

  sphereBody.position.set(0,0,1);
  sphereBody.linearDamping = 0.9;
  //sphereBody.fixedRotation = true;
  sphereBody.updateMassProperties();
  console.log(sphereBody)
  world.addBody(sphereBody)

  let heightfieldShape = new CANNON.Heightfield(matrix, {
    elementSize: 1 // Distance between the data points in X and Y directions
  })  

  let heightfieldBody = new CANNON.Body({
    mass: 0,
    material: physicsMaterial 
  })  
  
  let angle = (Math.PI / 2) * -1;
  let axis = new CANNON.Vec3(0, 0, 1)
  heightfieldBody.quaternion.setFromAxisAngle(axis, angle)

  heightfieldBody.position.set(-50, 50, 0)
  heightfieldBody.addShape(heightfieldShape)
  
  world.addBody(heightfieldBody);
  let ballShape = new CANNON.Sphere(0.15)
  let ballGeometry = new THREE.SphereGeometry(
    ballShape.radius, 
    32, 
    32
  )
  
  let shootVelo = 20;
  
  function getShootDirection(event, ctx) {
   let mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; 
  
    let raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, ctx.camera);
    let intersects = raycaster.intersectObjects(ctx.scene.children);

    let {
      x, y, z
    } = raycaster.ray.direction

    if(intersects && intersects.length > 0) {

      let intersect = intersects[0]
      intersect.object.material.color.set(0xdddddd)

      x *= (5 + intersect.distance)/intersect.distance
      
    }

    z = Math.pow(mouse.y + 2, 2);

    console.log(raycaster)
    console.log(intersects)
    
    return {x, y, z}
  }

  let balls = []
  let ballMeshes = []
  let boxes = []
  let boxMeshes = []

  let position = [-25, 5, 0]
  let v = [...position]
 
  for(let k = 0; k < 10; k++) {
    v[0] += 5;
    for(let i = 0; i < 8; i++) {
      v[2] = position[2]
      v[0] += 0.5

      for(let j = 0; j < 3; j++) {
        v[2] += 0.5;
        let box = Box()
          
        box.body.position.set(...v)
        box.mesh.position.set(...v)
      
        world.addBody(box.body)
        ctx.scene.add(box.mesh)
      
        boxes.push(box.body)
        boxMeshes.push(box.mesh)
      }    
    }
  }

  let material = new THREE.MeshLambertMaterial({ color: 0xffffff })
  
  window.addEventListener('click',function(e) {
    console.log('click', e)
    let {
      x, y, z
    } = sphereBody.position;

    let ballBody = new CANNON.Body({ mass: 1 });
    ballBody.addShape(ballShape);
    
    let ballMesh = new THREE.Mesh( ballGeometry, material );
    
    world.addBody(ballBody);
    
    ctx.scene.add(ballMesh);
    
    ballMesh.castShadow = true;
    ballMesh.receiveShadow = true;

    balls.push(ballBody);
    ballMeshes.push(ballMesh)

    let shootDirection = getShootDirection(event, ctx);
    
    ballBody.velocity.set(  
      shootDirection.x * shootVelo,
      shootDirection.y * shootVelo,
      shootDirection.z
    )
    
    x += shootDirection.x * (sphereShape.radius * 1.02 + ballShape.radius);
    y += shootDirection.y * (sphereShape.radius * 1.02 + ballShape.radius);
  
    //z += shootDirection.z * (sphereShape.radius * 1.02 + ballShape.radius);
    //z += (sphereShape.radius * 1.02 + ballShape.radius);
    ballBody.position.set(x,y,z);
    ballMesh.position.set(x,y,z);
  })

  return {
    world,
    ballMeshes,
    balls,
    boxMeshes,
    boxes,
    sphereBody
  }
}