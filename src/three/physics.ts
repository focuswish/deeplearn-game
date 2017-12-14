import * as CANNON from 'cannon'
import * as THREE from 'three'
//import * as P from 'three/examples/js/renderers/Projector';

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
  
  world.gravity.set(0,0,-1);
  world.broadphase = new CANNON.NaiveBroadphase();
  
  //world.addBody(body)

  // Create a sphere
  let sphereShape = new CANNON.Sphere(0.2)
  let sphereBody = new CANNON.Body({ mass: 1 });
  
  sphereBody.addShape(sphereShape)
  sphereBody.position.set(0,5,0);
  sphereBody.linearDamping = 0.9;
  
  world.addBody(sphereBody)

  let groundShape = new CANNON.Plane()
  let groundBody = new CANNON.Body({ 
    mass: 0, 
    position: new CANNON.Vec3(0,0,0) 
  })

  groundBody.addShape(groundShape)
  //groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), Math.PI/2);
  
  world.addBody(groundBody)

  let ballShape = new CANNON.Sphere(0.05)
  let ballGeometry = new THREE.SphereGeometry(
    ballShape.radius, 
    32, 
    32
  )
  
  let shootVelo = 15;
  
  function getShootDirection(event, ctx) {
   let mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; 
    
    let raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, ctx.camera);
    let intersects = raycaster.intersectObjects(ctx.scene.children);
    
    return intersects[0].point
  }

  let balls = []
  let ballMeshes = []

  let material 
  = new THREE.MeshLambertMaterial({ color: 0xdddddd })
  
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
    
    console.log('SHOOT DIRECTION', shootDirection)

    ballBody.velocity.set(  
      shootDirection.x * shootVelo,
      shootDirection.y * shootVelo,
      shootDirection.z * shootVelo
    )

        // Move the ball outside the player sphere
    x += shootDirection.x * (sphereShape.radius * 1.02 + ballShape.radius);
    y += shootDirection.y * (sphereShape.radius * 1.02 + ballShape.radius);
    z += shootDirection.z * (sphereShape.radius * 1.02 + ballShape.radius);
    
    ballBody.position.set(x,y,z);
    ballMesh.position.set(x,y,z);
  })

  return {
    world,
    ballMeshes,
    balls,
    sphereBody
  }
}