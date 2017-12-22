import * as THREE from 'three'
import * as CANNON from 'cannon'

export default function Sprite (ctx = {}) {
  Object.assign(this, ctx)
}

Sprite.prototype.create = function() {
  this.mesh = new THREE.Mesh(
    this.geometry, 
    this.material
  )
  this.mesh.geometry.translate(0, 0, 0.25)
  this.mesh.name = this.props.name
  this.mesh.castShadow = true;
  this.mesh.receiveShadow = true;
  this.mesh.userData = {
    ...this.mesh.userData,
    selectable: true,
    ...this.props,
  }  
}

Sprite.prototype.box = function(texture) {
  let dimensions = [0.25, 0.25, 0.25]

  // CANNON
  let cannonBoxShape = new CANNON.Box(new CANNON.Vec3(...dimensions))
  let body = new CANNON.Body({ mass: 5 })
  body.addShape(cannonBoxShape)

  // THREE
  Sprite.apply(this, [{
    geometry: new THREE.BoxGeometry(...dimensions.map(d => d * 2)),
    material: new THREE.MeshLambertMaterial({ 
      map: texture, 
      vertexColors: THREE.VertexColors 
    }), 
    props: {
      name: 'box',
      health: 20,
      maxHealth: 20,
      body: body.id
    }
  }])

  this.body = body;
  this.create()

  return this
}

Sprite.prototype.rock = function(radius = 0.2, detail = 0) {
  let rock = {}

  let geometry = new THREE.DodecahedronGeometry(radius, detail)

  let material = new THREE.MeshLambertMaterial({ 
    color: 0x999999,
    vertexColors: THREE.VertexColors 
  }) 

  Sprite.apply(this, [{
    geometry,
    material,
    props: {
      name: 'rock',
      health: 20,
      maxHealth: 20,
    }
  }])
  
  this.create()

  return this;

}