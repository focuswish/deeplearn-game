import * as uuid from "uuid";
import IceLance from "./components/IceLance";
import Helpers from "./util/helpers";
import Widget from "./Widget";
import * as THREE from 'three'
function Keyboard() {}

Keyboard.prototype.handleKeyDown = function() {
  let nearbyIndex = 0;
  const helpers = Object.create(Helpers.prototype, {
    avatar: {
      writable: true,
      configurable: true,
      value: this.avatar
    },
    scene: {
      writable: true,
      configurable: true,
      value: this.scene
    }
  });
  const nearby = this.base.getNearby.bind(this)
  console.log('Keyboard.prototype.handleKeyDown', this)

  const icelance = new IceLance()
  
  window.addEventListener("keydown", (e) => {
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
        let target = helpers.getSelected();
        let origin = {...this.avatar.position}
     
        if(target) {
          icelance.emit.apply(this, [
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
            this.ws.send(
              JSON.stringify({
                target: target.userData.id,
                origin: origin,
                timestamp: new Date().getTime() / 1000,
                type: "icelance",
                userName: this.avatar.userData.name
              })
            );
          }
        }
        break;
    }
  })
};

export default Keyboard;
