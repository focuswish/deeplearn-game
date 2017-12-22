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
  this.mesh.name = name
  this.mesh.castShadow = true;
  this.mesh.receiveShadow = true;
  this.mesh.userData = {
    ...this.mesh.userData,
    selectable: true,
    ...this.props,
  }  
}

Sprite.prototype.set = function(props = {}) {
  this.mesh.userData = {
    ...this.mesh.userData,
    selectable: true,
    health: 100,
    maxHealth: 100,
    ...props,
  }

  return this;
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