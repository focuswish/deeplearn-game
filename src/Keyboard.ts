import * as uuid from "uuid";
import IceLance from "./components/IceLance";
import * as THREE from 'three'
import * as CANNON from 'cannon'

function Keyboard() {}

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

          let selected = nearby()[nearbyIndex].object;
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
          this.weapon.icelance.apply(this, [
              uuid(), 
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


Keyboard.prototype.PointerLockControls = function (camera, cannonBody, avatar) {  
  let jumpVelocity = 10;
  let scope = this;
  
  let pitchObject = new THREE.Object3D()
  pitchObject.add(camera)
  
  let yawObject = new THREE.Object3D();
  yawObject.position.z = 2;

  yawObject.add(pitchObject)
  
  let quat = new THREE.Quaternion();
  
  let moveForward = false;
  let moveBackward = false;
  let moveLeft = false;
  let moveRight = false;
  
  let canJump = false;
  
  let contactNormal = new CANNON.Vec3();
  let upAxis = new CANNON.Vec3(0,0,1);
      
  cannonBody.addEventListener('collide', function(e){
    var contact = e.contact;
  
    if(contact.bi.id == cannonBody.id) {
      contact.ni.negate(contactNormal);
    } else {
      contactNormal.copy(contact.ni)
    } 

    if(contactNormal.dot(upAxis) > 0.5) {
      canJump = true;
    }

  })
  
  let { velocity } = cannonBody
  let PI_2 = Math.PI / 2;
  
  const onMouseMove = function (event) {
    if ( scope.enabled === false ) return;

    var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    yawObject.rotation.z -= movementX * 0.002;
    pitchObject.rotation.x -= movementY * 0.002;

    pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );
  }
  
  const onKeyDown = function (event) {
    if(cannonBody.sleepState === 2) cannonBody.wakeUp()
          
    switch ( event.keyCode ) {
      case 38: // up
      case 87: // w
        moveForward = true;
        break;
  
      case 37: // left
      case 65: // a
        moveLeft = true; 
        break;
  
      case 40: // down
      case 83: // s
        moveBackward = true;
        break;
  
      case 39: // right
      case 68: // d
        moveRight = true;
        break;
  
      case 32: // space
        if (canJump === true) {
          velocity.z = jumpVelocity;
        }
        canJump = false;
        break;
    }
  };
  
  const onKeyUp = function ( event ) {    
    switch( event.keyCode ) {
      case 38: // up
      case 87: // w
        moveForward = false;
        break;
  
      case 37: // left
      case 65: // a
        moveLeft = false;
        break;
  
      case 40: // down
      case 83: // a
        moveBackward = false;
        break;
  
      case 39: // right
      case 68: // d
        moveRight = false;
        break;
    };
  };
  
  document.addEventListener( 'mousemove', onMouseMove, false );
  document.addEventListener( 'keydown', onKeyDown, false );
  document.addEventListener( 'keyup', onKeyUp, false );
  
  this.enabled = false;
  
  this.getObject = function () {
    return yawObject;
  };
  
  this.getDirection = function(targetVec){
    targetVec.set(0,0,-1);
    quat.multiplyVector3(targetVec);
  }
  
      // Moves the camera to the Cannon.js object position and adds velocity to the object if the run key is down
  var inputVelocity = new THREE.Vector3();
  var euler = new THREE.Euler();

  this.update = function (delta) {
    //if ( scope.enabled === false ) return;
  
    delta *= 0.1;    
    inputVelocity.set(0,0,0);

    let direction = camera.getWorldDirection();
          
    if (moveForward) inputVelocity = direction.multiplyScalar(0.5)
    
    if (moveBackward) inputVelocity = direction.negate().multiplyScalar(0.5)
      
    if (moveLeft) {
      pitchObject.rotation.z += 0.2
      avatar.children[1].rotateZ(0.2)
    }

    if (moveRight) {
      pitchObject.rotation.z += -0.2
      avatar.children[1].rotateZ(-0.2)
    }
  
    // Convert velocity to world coordinates
    euler.x = pitchObject.rotation.x;
    euler.z = yawObject.rotation.z;
    euler.order = "XYZ";
    quat.setFromEuler(euler);
    inputVelocity.applyQuaternion(quat);
  
    // Add to the object
    velocity.x += inputVelocity.x;
    velocity.y += inputVelocity.y;
          
    yawObject.position.copy(cannonBody.position);
  };
};

export default Keyboard;
