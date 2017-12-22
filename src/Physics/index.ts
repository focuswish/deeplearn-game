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

Physics.prototype.spawnTrees = function() {
  let { terrain, scene } = this;
  let register = this.base.register.bind(this)
  let tree = Tree()
  const spawn = () => {
    let clumpSize = Math.floor(Math.random() * 20)
    let clumpCount = Math.floor(Math.random() * 20)
    let placements = this.base.generatePlacements.apply(this, [clumpCount, clumpSize])
    for(let i = 0; i < placements.length; i++) {
      tree = tree.clone()
      let scale = Math.random() * (1 - 0.5) + 0.5;
      tree.scale.set(scale, scale, scale)
      tree.position.copy(placements[i])
      register(tree, null)
       
    }
  }

  return spawn()
}


Physics.prototype.addHeightfield = function() {
  let matrix = []
  let vert = this.tiles[0].geometry.vertices
  let segments = Math.sqrt(vert.length)
  let { worldSize } = this._terrain
  let index = 0;
  
  for(let x = 0; x < segments; x++) {
    matrix[x] = []

    for(let y = 0; y < segments; y++) {
      matrix[x][y] = vert[index].z;
      index++
    }
  } 

  let heightfieldShape = new CANNON.Heightfield(matrix, {
    elementSize: worldSize/segments
  })  

  let heightfieldBody = new CANNON.Body({
    mass: 0,
    material: this.physicsMaterial 
  })  
  
  let angle = (Math.PI / 2) * -1;
  let axis = new CANNON.Vec3(0, 0, 1)
  heightfieldBody.quaternion.setFromAxisAngle(axis, angle)

  heightfieldBody.position.set(-1 * worldSize/2, worldSize/2, 0)
  heightfieldBody.addShape(heightfieldShape)
  this.cannon.world.addBody(heightfieldBody)
 
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
    
  this.cannon.world.addContactMaterial(physicsContactMaterial);
  
  return physicsContactMaterial
}

Physics.prototype.createDefaultPhysicsWorld = function() {
  let { world } = this.cannon;
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

  return this;
}

Physics.prototype.createPlayerSphere = function () {
  let bottomSnowman = this.scene.getObjectByName('snowman/bottom', true)
  bottomSnowman.children[0].geometry.computeBoundingSphere()
  
  let { boundingSphere } = bottomSnowman.children[0].geometry;

  let playerSphereShape = new CANNON.Sphere(boundingSphere.radius)
  let playerSphereBody = new CANNON.Body({ 
    mass: 1, 
    material: this.cannon.physicsMaterial 
  })
    
  playerSphereBody.addShape(playerSphereShape)
  
  playerSphereBody.position.set(0,0,5);
  playerSphereBody.linearDamping = 0.90;
    //playerSphereBody.addEventListener('collide', function(evt) {
    //});

  playerSphereBody.fixedRotation = true;

  this.cannon.world.addBody(playerSphereBody)
  
  return playerSphereBody;
  
}

Physics.prototype.spawnBoxes = function() {
  const s = () => Math.random() > 0.5 ? -1 : 1;
  const spawn = () => {
    let placements = this.base.generatePlacements.apply(this, [20, 2])
    for(let i = 0; i < placements.length; i++) {
      let box = this.sprite.box(this._assets.textures['crate'])
      box.body.position.copy(placements[i])
      this.base.register.apply(this, [box.mesh, box.body])
    }
  }

  let placements = this.base.generatePlacements.apply(this, [20, 2])
  for(let i = 0; i < placements.length; i++) {
    let rock = this.sprite.rock()
    rock.mesh.position.copy(placements[i])
    this.base.register.apply(this, [rock.mesh, null])
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
  let mouse = new THREE.Vector2()
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
      return getParentMesh(mesh.parent)
    }
    
    return mesh
  }

  if(!isEmpty(intersects)) {
    let intersect = intersects[0]

    this.UI.target(
      getParentMesh(intersect.object)
    )  
  }

  return intersects
}
 
Physics.prototype.init = function() {  
  let uid = this.avatar.userData.id
  this.physics.createDefaultPhysicsWorld.apply(this)

  let body = this.physics.createPlayerSphere.apply(this)
  
  this.data[uid].body = body;
  this.data[uid].mesh.userData.body = body.id;

  this.physics.createPhysicsContactMaterial.apply(this)
  this.physics.addHeightfield.apply(this)
  this.physics.spawnBoxes.apply(this)
  this.physics.spawnTrees.apply(this)
  
  window.addEventListener('click', (e) => {
    let {
      x, y, z
    } = this.data[this.avatar.userData.id].body.position;

    let intersects = this.physics.getClickTarget.apply(this, [event]);
  })

  return this.physics;
}

export function Physics() {}