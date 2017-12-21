import IceLance from './components/IceLance'
import * as THREE from 'three'
import * as CANNON from 'cannon'
import * as uuid from 'uuid'
import Snowman from './components/Snowman'
import { getUnixTime } from './util/helpers'

export default function Socket() {}

Socket.prototype.send = function(data) {
  this._socket.ws.send(
    JSON.stringify({
      ...data,
      userName: this.avatar.userData.name, 
      id: this.avatar.userData.id,     
      timestamp: (new Date()).getTime() / 1000
    })
  )
}

Socket.prototype.handleMessage = function() {
  this._socket.ws.onmessage = (event) => {
    let message = JSON.parse(event.data)
  
    if(message.type === 'icelance') {      
      let target = this.data[message.target]
  
      if(target && target.mesh) {
        let {x, y, z} = message.origin
        
        this.weapon.icelance.apply(this, [
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
