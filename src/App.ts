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
import { randomArrayInRange } from 'deeplearn/dist/test_util';
import {
  getUnixTime,
  segment,
  segmentTopography
} from './util/helpers'
import Keyboard from './Keyboard'
import Context from './Context'
import Base from './Base'
import Assets from './Assets'
import * as cookie from 'cookie'

function World() {
  Context.apply(this)
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
  //body.style.backgroundImage = 'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)'
  this.UI.welcomeScreen()

  let btn = document.querySelector('button')
  let input  = document.querySelector('input')
  let container = document.getElementById('ui-container')

  return new Promise((resolve, reject) => {
    const onclick = (evt) => {
      if(input && input.value) {
        this.userName = input.value;
        container.parentElement.removeChild(container);
        //body.style.backgroundImage = ''
        //this.scene.background = this._assets.textures['gradient2']
        resolve()
      }
    }
  
    btn.addEventListener('click', onclick)
  })
}

World.prototype.onWindowResize = function() {
  this.camera.aspect = window.innerWidth / window.innerHeight;
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(window.innerWidth, window.innerHeight);
}

World.prototype.update = function() {
  
  let timeStep = 1/60
  let fixedTimeStep = 0.5;
  let maxSubSteps = 3;   

  let start = getUnixTime()
  let lastUpdated = getUnixTime()
  let getHeroTargetMesh = this.base.getHeroTargetMesh.bind(this)
  let heroTarget = getHeroTargetMesh()
  
  return () => {
    let _heroTarget = getHeroTargetMesh()
    let timeSinceLastCall = getUnixTime() - start

    this.cannon.world.step(timeStep, timeSinceLastCall, maxSubSteps);
    
    this.base.sync.apply(this, ['snowballs'])
    this.base.sync.apply(this, ['boxes'])
    this.base.sync.apply(this, ['icelances'])
     
    let players = Object.keys(this.data)
  
    if(
      _heroTarget &&
      _heroTarget.position && 
      heroTarget !== _heroTarget     
    ) {
      console.log(_heroTarget)
      heroTarget = _heroTarget;
      let { position: { x, y } } = heroTarget
      let z = this.base.getZ.apply(this, [x, y])
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
    
    this.renderer.render(
      this.scene, this.camera
    );

    if((getUnixTime() - lastUpdated) > 0.5) {
      this.base.tick.apply(this)
      lastUpdated = getUnixTime()      
    }

    start = getUnixTime()
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
  this.render = this.update()
  this.createHalo()
  this.animate()

  this.keyboard.handleKeyDown.apply(this)
  this.socket.handleMessage.apply(this)
 
}

World.prototype.animate = function() {
  requestAnimationFrame(this.animate.bind(this))
  this.camera.position.setZ(
    this.avatar.position.z + this.zoom
  )
  this.render()
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
  let uid = cookie.parse(document.cookie).token || uuid()
  let avatar = Snowman(
    uid, 
    this.userName,
    this._assets.font
  )

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