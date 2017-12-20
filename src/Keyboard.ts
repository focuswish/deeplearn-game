import * as uuid from "uuid";
import IceLance from "./components/IceLance";
import Helpers from "./util/helpers";
import Widget from "./Widget";

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
            Widget(this.avatar, this._assets.textures['gradient1']).target(selected, this.avatar)
          }
        }
        break;
      case "Digit1":
        let target = helpers.getSelected();
        let origin = this.avatar.position.clone();
        
        console.log('target', target)

        if(target) {
          IceLance.prototype.emit.apply(this, [uuid(), origin, target]);          
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
                type: "icelance"
              })
            );
          }
        }
        break;
    }
  })
};

export default Keyboard;
