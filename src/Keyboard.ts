import * as uuid from "uuid";
import * as THREE from 'three'
import * as CANNON from 'cannon'

function Keyboard(ctx = {}) {
  Object.assign(this, ctx)
}

Keyboard.prototype.handleKeyDown = function() {
  let nearbyIndex = 0;
  let avatarCanAttack = true;
  const nearby = this.base.getNearby.bind(this)
  
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case "Equal":
        this.zoom--;
        break;
      case "Minus":
        this.zoom++;
        break;
      case "Backquote":
        if (nearby()) {
          if (nearby().length <= nearbyIndex) {
            nearbyIndex = 0;
          }

          let selected = nearby()[nearbyIndex]
          if (selected) {
            nearbyIndex++;
            this.UI.target(selected)
          }
        }
        break;
      case "Digit1":
        
        if(!avatarCanAttack) return;

        avatarCanAttack = false;
        setTimeout(() => {
          avatarCanAttack = true;
        }, 500)
        
        let target = this.base.getHeroTargetMesh.apply(this)
        let origin = {...this.avatar.position}
        
        if(target) {
          this.weapon.fire.apply(this, [
              'icelance', 
              origin,
              target
            ]
          )          
          if(
            target.userData && 
            target.userData.id && 
            target.userData.type === 'player'
          ) {
            this.socket.send.apply(this, [{
              target: target.userData.id,
              origin: origin,
              type: "icelance",
            }]);
          }
        }
        break;
    }
  })
};


Keyboard.prototype.PointerLockControls = function () {  
  let cannonBody = this.data[this.avatar.userData.id].body
  this._keyboard.cannonBody = cannonBody
  this._keyboard.jumpVelocity = 10;
  this._keyboard.canJump = false;
  let scope = this;
  
  this._keyboard.cannonBody = cannonBody;  
  this._keyboard.pitchObject = new THREE.Object3D()
  this._keyboard.pitchObject.add(this.camera)
  
  this._keyboard.yawObject = new THREE.Object3D();
  this._keyboard.yawObject.position.z = 2;

  this._keyboard.yawObject.add(this._keyboard.pitchObject)
  
  this._keyboard.quat = new THREE.Quaternion();

  this._keyboard.moveForward = false;
  this._keyboard.moveBackward = false;
  this._keyboard.moveLeft = false;
  this._keyboard.moveRight = false;  
  
  let contactNormal = new CANNON.Vec3();
  let upAxis = new CANNON.Vec3(0,0,1);
      
  cannonBody.addEventListener('collide', (e) => {
    var contact = e.contact;
  
    if(contact.bi.id == cannonBody.id) {
      contact.ni.negate(contactNormal);
    } else {
      contactNormal.copy(contact.ni)
    } 

    if(contactNormal.dot(upAxis) > 0.5) {
      this._keyboard.canJump = true;
    }
  })
  
  let { velocity } = cannonBody
  let PI_2 = Math.PI / 2;
  
  const onMouseMove = (event) => {
    if ( this._keyboard.enabled === false ) return;

    var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    this._keyboard.yawObject.rotation.z -= movementX * 0.002;
    this._keyboard.pitchObject.rotation.x -= movementY * 0.002;

    this._keyboard.pitchObject.rotation.x = Math.max( 
      - PI_2, 
      Math.min( 
        PI_2, 
        this._keyboard.pitchObject.rotation.x 
      ) 
    )
  }
  
  const onKeyDown = (event) => {
    if(cannonBody.sleepState === 2) cannonBody.wakeUp()
          
    switch ( event.keyCode ) {
      case 38: // up
      case 87: // w
        this._keyboard.moveForward = true;
        break;
  
      case 37: // left
      case 65: // a
        this._keyboard.moveLeft = true; 
        break;
  
      case 40: // down
      case 83: // s
        this._keyboard.moveBackward = true;
        break;
  
      case 39: // right
      case 68: // d
        this._keyboard.moveRight = true;
        break;

      case 32: // space
        if (this._keyboard.canJump === true) {
          velocity.z = this._keyboard.jumpVelocity;
        }
        this._keyboard.canJump = false;
        break;
    }
  };
  
  const onKeyUp = ( event ) => {    
    switch( event.keyCode ) {
      case 38: // up
      case 87: // w
        this._keyboard.moveForward = false;
        break;
  
      case 37: // left
      case 65: // a
        this._keyboard.moveLeft = false;
        break;
  
      case 40: // down
      case 83: // a
        this._keyboard.moveBackward = false;
        break;
  
      case 39: // right
      case 68: // d
        this._keyboard.moveRight = false;
        break;
    }
  }
  
  document.addEventListener( 'mousemove', onMouseMove.bind(this), false );
  document.addEventListener( 'keydown', onKeyDown.bind(this), false );
  document.addEventListener( 'keyup', onKeyUp.bind(this), false );
  
  this._keyboard.enabled = false; 
  this._keyboard.inputVelocity = new THREE.Vector3();
  this._keyboard.euler = new THREE.Euler();
}

Keyboard.prototype.getObject = function() {
  return this._keyboard.yawObject;
}

Keyboard.prototype.getDirection = function(targetVec) {
  targetVec.set(0, 0, -1)
  this._keyboard.quat.multiplyVector3(targetVec)
}

Keyboard.prototype.update = function(delta) {

  let {
    inputVelocity,
    moveBackward,
    moveForward,
    moveLeft,
    moveRight,
    pitchObject,
    yawObject,
    euler,
    quat
  } = this._keyboard

  let { velocity } = this._keyboard.cannonBody;
  
  delta *= 0.1;    
  inputVelocity.set(0,0,0);

  let direction = this.camera.getWorldDirection();
        
  if (moveForward) {
    inputVelocity = direction.multiplyScalar(0.5)
  }
  
  if (moveBackward) {
    inputVelocity = direction.negate().multiplyScalar(0.5)
  }
    
  if (moveLeft) {
    pitchObject.rotation.z += 0.2
    this.avatar.children[1].rotateZ(0.2)
  }

  if (moveRight) {
    pitchObject.rotation.z += -0.2
    this.avatar.children[1].rotateZ(-0.2)
    console.log('moveRight)',moveRight)
    
  }

  euler.x = pitchObject.rotation.x
  euler.z = yawObject.rotation.z
  euler.order = 'XYZ'
  quat.setFromEuler(euler)
  inputVelocity.applyQuaternion(quat)

  velocity.x += inputVelocity.x;
  velocity.y += inputVelocity.y;
        
  this._keyboard.yawObject.position.copy(
    this._keyboard.cannonBody.position
  )
}


export default Keyboard;
