/**
 * @author mrdoob / http://mrdoob.com/
 * @author schteppe / https://github.com/schteppe
 */

import * as THREE from 'three'
import * as CANNON from 'cannon'

function PointerLockControls(camera, cannonBody, avatar) {
  
      var eyeYPos = 2; // eyes are 2 meters above the ground
      var velocityFactor = 0.2;
      var jumpVelocity = 10;
      var scope = this;
  
      var pitchObject = new THREE.Object3D();
      pitchObject.add( camera );
  
      var yawObject = new THREE.Object3D();
      yawObject.position.z = 2;
      yawObject.add( pitchObject );
  
      var quat = new THREE.Quaternion();
  
      var moveForward = false;
      var moveBackward = false;
      var moveLeft = false;
      var moveRight = false;
  
      var canJump = false;
  
      var contactNormal = new CANNON.Vec3(); // Normal in the contact, pointing *out* of whatever the player touched
      var upAxis = new CANNON.Vec3(0,0,1);
      
      cannonBody.addEventListener("collide",function(e){
          var contact = e.contact;
  
          // contact.bi and contact.bj are the colliding bodies, and contact.ni is the collision normal.
          // We do not yet know which one is which! Let's check.
          if(contact.bi.id == cannonBody.id)  // bi is the player body, flip the contact normal
              contact.ni.negate(contactNormal);
          else
              contactNormal.copy(contact.ni); // bi is something else. Keep the normal as it is
  
          // If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
          if(contactNormal.dot(upAxis) > 0.5) // Use a "good" threshold value between 0 and 1 here!
              canJump = true;
      });
  
      var velocity = cannonBody.velocity;
  
      var PI_2 = Math.PI / 2;
  
      var onMouseMove = function ( event ) {
        if ( scope.enabled === false ) return;

        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        yawObject.rotation.z -= movementX * 0.002;
        pitchObject.rotation.x -= movementY * 0.002;

        pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );
      };
  
      var onKeyDown = function ( event ) {
          switch ( event.keyCode ) {
  
              case 38: // up
              case 87: // w
                  moveForward = true;
                  break;
  
              case 37: // left
              case 65: // a
                  moveLeft = true; break;
  
              case 40: // down
              case 83: // s
                  moveBackward = true;
                  break;
  
              case 39: // right
              case 68: // d
                  moveRight = true;
                  break;
  
              case 32: // space
                  if ( canJump === true ){
                      velocity.z = jumpVelocity;
                  }
                  canJump = false;
                  break;
          }
  
      };
  
      var onKeyUp = function ( event ) {
        
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
  
          }
  
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
      this.update = function ( delta ) {
  
          //if ( scope.enabled === false ) return;
  
          delta *= 0.1;
        
          inputVelocity.set(0,0,0);

          let direction = camera.getWorldDirection();
          
          if (moveForward){
            inputVelocity = direction.multiplyScalar(2)
          }
          if (moveBackward){
            inputVelocity = direction.negate().multiplyScalar(2)
          }
  
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

 export default PointerLockControls