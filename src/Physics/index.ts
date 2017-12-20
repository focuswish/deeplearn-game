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
import Widget from '../Widget'

Physics.prototype.spawnTrees = function() {
  let { terrain, scene } = this;
  let register = this.base.register.bind(this)
  let getRandomPointOnPerimeter = this.base.getRandomPointOnPerimeter.bind(this)

  const spawn = () => {
    let anchor = getRandomPointOnPerimeter()

    for(let i = 0; i < 10; i++) {
      let tree = Tree()
      let scale = Math.random() * (1 - 0.5) + 0.5;
      
      anchor = anchor.add(new THREE.Vector3(0, 0.5, 0))
      tree.rotation.set(Math.PI / 2, Math.PI / 2, 0)
      tree.scale.set(scale, scale, scale)
      tree.position.copy(anchor)

      register(tree, null, 'trees', spawn)
    }
  }

  return spawn()
}


Physics.prototype.addHeightfield = function() {
  let matrix = []
  let vert = this.tiles[0].geometry.vertices

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
    material: this.physicsMaterial 
  })  
  
  let angle = (Math.PI / 2) * -1;
  let axis = new CANNON.Vec3(0, 0, 1)
  heightfieldBody.quaternion.setFromAxisAngle(axis, angle)

  heightfieldBody.position.set(-50, 50, 0)
  heightfieldBody.addShape(heightfieldShape)
  
  this.world.addBody(heightfieldBody)
 
  return heightfieldBody
}

Physics.prototype.createPhysicsContactMaterial = function() {
  let physicsMaterial = new CANNON.Material('slipperyMaterial')
  
  let physicsContactMaterial = new CANNON.ContactMaterial(
    physicsMaterial,
    physicsMaterial, {
      friction: 1.0,
      restitution: 0.3,
  })
    
  this.world.addContactMaterial(physicsContactMaterial);
  
  return physicsContactMaterial
}

Physics.prototype.createDefaultPhysicsWorld = function() {

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

  this.world = world;
  return this;
}

Physics.prototype.createPlayerSphere = function () {
  let bottomSnowman = this.scene.getObjectByName('snowman/bottom', true)
  bottomSnowman.children[0].geometry.computeBoundingSphere()
  
  let { boundingSphere } = bottomSnowman.children[0].geometry;

  let playerSphereShape = new CANNON.Sphere(boundingSphere.radius)
  let playerSphereBody = new CANNON.Body({ 
    mass: 1, 
    material: this.physicsMaterial 
  })
    
  playerSphereBody.addShape(playerSphereShape)
  
  playerSphereBody.position.set(0,0,5);
  playerSphereBody.linearDamping = 0.90;
    //playerSphereBody.addEventListener('collide', function(evt) {
    //});

  playerSphereBody.fixedRotation = true;

  this.world.addBody(playerSphereBody)
  
  return playerSphereBody;
  
}

Physics.prototype.spawnBoxes = function() {
  let getRandomPointOnPerimeter = this.base.getRandomPointOnPerimeter.bind(this)
  let register = this.base.register.bind(this)

  const spawn = () => {
    let anchor = getRandomPointOnPerimeter()
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

      register(box.mesh, box.body, 'boxes', spawn)
    })
  }

  return spawn()
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

Physics.prototype.getClickTarget = function(event) {
  let mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; 

   let raycaster = new THREE.Raycaster();
   raycaster.setFromCamera(mouse, this.camera);

   let intersects = raycaster.intersectObjects(
     this.scene.children.filter(child => 
        child.userData && 
        child.userData.selectable &&
        child.id !== this.avatar.id
     ),
     true
   )
  
  const getParentMesh = (mesh) => {
    if(mesh.parent && mesh.parent.type !== 'Scene') {
      return this.physics.getParentMesh(mesh.parent)
    }
    
    return mesh
  }

  if(!isEmpty(intersects)) {
    let intersect = intersects[0]

    Widget(this.avatar, this._assets.textures.gradient2).target(
      getParentMesh(intersect.object)
    )  
  }

  return intersects
}
 
Physics.prototype.init = function() {  
  this.physics.createDefaultPhysicsWorld.apply(this)
  this.data[this.avatar.userData.id].body = this.physics.createPlayerSphere.apply(this)  
  this.physics.createPhysicsContactMaterial.apply(this)
  this.physics.addHeightfield.apply(this)
  this.physics.spawnBoxes.apply(this)
  this.physics.spawnTrees.apply(this)
  
  window.addEventListener('click', (e) => {
    let {
      x, y, z
    } = this.data[this.avatar.userData.id].body.position;

    let intersects = this.physics.getClickTarget.apply(this, [event]);
    
    //let icelanceId = uuid()
    //let origin = new THREE.Vector3()
    //  .copy(playerSphereBody.position)
    //  .setComponent(2, playerSphereBody.position.z + 1)
  
    //let icelance = cannonContext.createIceLance(
    //  icelanceId, 
    //  origin,
    //  shootDirection.target
    //)
  
    //ctx.ws.send(JSON.stringify({
    //  position: {x, y, z},
    //  velocity: icelance.body.velocity,
    //  id: icelance.mesh.name,
    //  timestamp: new Date().getTime() / 1000,
    //  type: 'snowball',
    //  target: shootDirection.target
    //}))
  })

  return this.physics;
}

export function Physics() {}