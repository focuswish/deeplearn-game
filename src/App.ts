//scene and camera setup
import * as THREE from 'three'
import * as fractal from 'fractal-terrain-generator'
import { sample, findIndex, flatten, chunk, take, tail } from 'lodash'
import * as CANNON from 'cannon'
import { Physics } from './Physics'
import {
  Rock, 
  Wood, 
  Stone, 
  generateTerrainObjects,
  generateCampfire
} from './components/objects'
import Terrain from './components/Terrain'
import Snowman from './components/Snowman'
import Tree from './components/Tree';
import PointerLockControls from './util/PointerLockControls'
import * as uuid from 'uuid/v4'
import Widget from './Widget'
import { randomArrayInRange } from 'deeplearn/dist/test_util';
import Helper, {
  loadFont,
  getUnixTime,
  segment,
  segmentTopography
} from './util/helpers'
import Keyboard from './Keyboard'
import IceLance from './components/IceLance'
import Context from './Context'
import Base from './Base'
import Assets from './Assets'

function World() {
  Context.apply(this)
  THREE.Object3D.DefaultUp.set(0, 0, 1)
  console.log(this)
}

World.prototype.assets = Object.create(Assets.prototype)
World.prototype.physics = Object.create(Physics.prototype)
World.prototype.base = Object.create(Base.prototype)

World.prototype.light = function() {
  let light = new THREE.HemisphereLight(0xfffafa,0x000000, .7)
  let sun = new THREE.DirectionalLight( 0xcdc1c5, 0.9);
  sun.position.set(-10, -10, 10)
  sun.castShadow = true;

  this.scene.add(light)
  this.scene.add(sun)

  return this
}

World.prototype.intro = async function() {
  let assets = await this.assets.load.apply(this)

  let body = document.querySelector('body')
  body.style.backgroundImage = 'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)'
  console.log(this)
  this.UI.welcomeScreen()

  let btn = document.querySelector('button')
  let input  = document.querySelector('input')
  let container = document.getElementById('ui-container')

  return new Promise((resolve, reject) => {
    const onclick = (evt) => {
      if(input && input.value) {
        this.userName = input.value;
        container.parentElement.removeChild(container);
        body.style.backgroundImage = ''
        this.scene.background = this._assets.textures['gradient2']
        resolve()
      }
    }
  
    btn.addEventListener('click', onclick)
  })
}

World.prototype.onResize = function() {
  this.camera.aspect = window.innerWidth / window.innerHeight;
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(window.innerWidth, window.innerHeight);
}

World.prototype.render = function() {
  
  let timeStep = 1/60
  let fixedTimeStep = 0.5;
  let maxSubSteps = 3;   

  let start = getUnixTime()
  let lastUpdated = getUnixTime()

  let helper = {
    getSelected: Helper.prototype.getSelected.bind(this),
    randomPositionOnTerrain: Helper.prototype.randomPositionOnTerrain.bind(this),
    getZ: Helper.prototype.getZ.bind(this)
  }

  let selected = helper.getSelected()
  
  return () => {
    var timeSinceLastCall = getUnixTime() - start
    this.world.step(timeStep, timeSinceLastCall, maxSubSteps);
    
    this.base.sync.apply(this, ['snowballs'])
    this.base.sync.apply(this, ['boxes'])
    this.base.sync.apply(this, ['icelances'])
     
    let players = Object.keys(this.data)
  
    if(selected !== helper.getSelected()) {
      selected = helper.getSelected()
      let { position: { x, y } } = selected
      let z = helper.getZ(x, y)
      this.halo.visible = true;
      this.halo.position.set(x, y, z)
    }
  
    if(players.length > 0) {
      players.forEach(key => {
        let player = this.data[key]        
        player.mesh.position.copy(player.body.position)
        player.mesh.children[0].quaternion.copy(player.body.quaternion)
      })
    }
  
    this.controls.update(timeSinceLastCall)
    this.base.update.apply(this)
      
    start = getUnixTime()

    this.renderer.render(
      this.scene, this.camera
    );
  }
}

World.prototype.init = function() {
  
  let pointerlockchange = (event) => {
    this.controls.enabled = true;
  }

  window.addEventListener('resize', this.onWindowResize, false)
  document.addEventListener( 'pointerlockchange', pointerlockchange, false );
  document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
  document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );   

  this.controls = new PointerLockControls(
    this.camera, 
    this.data[this.avatar.userData.id].body, 
    this.avatar
  );

  this.scene.add(this.controls.getObject())
  this.createHalo()
  this.animate()

  this.base.tick.apply(this)

  Keyboard.prototype.handleKeyDown.apply(this)

  this.ws.onmessage = (event) => {
    let message = JSON.parse(event.data)

    if(message.type === 'icelance') {      
      let target = this.data[message.target]

      if(target && target.mesh) {
        let {x, y, z} = message.origin
        
        IceLance.prototype.emit.apply(this, [
          uuid(), 
          new THREE.Vector3(x, y, z), 
          target.mesh
        ])      
      }
      return
    }

    if(message.type !== 'player') return
    if(!this.data[message.id]) this.data[message.id] = {}
      
    let cached = this.data[message.id]
    cached.message = message;

    if(message.id === this.avatar.userData.id) return  

    if(!cached.didSpawn) {
      this.data[message.id].didSpawn = true;
      let snowman = Snowman(message.id, message.userName, this._assets.font)
      console.log(snowman)
      this.scene.add(snowman)

      let playerSphereBody = this.physics.createPlayerSphere.apply(this)

      this.data[message.id].mesh = snowman      
      this.data[message.id].body = playerSphereBody
    } 

    this.data[message.id].latency = getUnixTime() - cached.timestamp
    this.data[message.id].shouldUpdate = true;

    let { position, velocity } = message;

    let nextPosition = new THREE.Vector3(position.x, position.y, position.z)
    let nextVelocity = new CANNON.Vec3(velocity.x, velocity.y, velocity.z)

    cached.body.position.copy(nextPosition)
    cached.body.velocity.copy(nextVelocity)
  };
}

World.prototype.animate = function() {
  requestAnimationFrame(this.animate.bind(this))
  this.camera.position.setZ(
    this.avatar.position.z + this.zoom
  )
  this.render()()
}

World.prototype.createHalo = function() {
  let halo = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshBasicMaterial({opacity: 0.5, transparent: true, color: 0x0000ff})
  )

  halo.name = 'halo'
  halo.up.set(0,0,1)
  halo.rotateOnAxis(new THREE.Vector3(0,0,1), Math.PI/2)
  halo.visible = false

  this.halo = halo;
  this.scene.add(this.halo)

  return this;
}

World.prototype.createAvatar = function() {
  let avatar = Snowman(
    uuid(), 
    this.userName,
    this._assets.font
  )
  let uid = avatar.userData.id;

  this.data[uid] = {}
  this.data[uid].mesh = avatar;
  this.data[uid].didSpawn = false;
  this.data[uid].id = avatar.name
  this.data[uid].timestamp = new Date().getTime() / 1000

  this.scene.add(this.data[uid].mesh)
  this.avatar = this.data[uid].mesh;
  this.scene.updateMatrixWorld()
  
  this.UI.init(avatar, this._assets.textures['gradient1'])
  
  this.physics.init.apply(this)

  return this;
}

declare global {
  interface Window { 
    camera: any;
    Terrain: any;
    Sprite: any;
    World: any;
  }
}


let world = new World()
console.log(world)
world.intro().then(() => {
  world.light().createAvatar().init()
})

export default World;