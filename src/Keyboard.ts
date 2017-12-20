import * as uuid from "uuid";
import IceLance from "./components/IceLance";
import Helpers from "./util/helpers";
import { Widget } from "./Widget";

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

  window.addEventListener("keydown", (e) => {
    console.log(this.widget)
    switch (e.code) {
      case "Equal":
        this.zoom--;
        break;
      case "Minus":
        this.zoom++;
        break;
      case "Backquote":
        console.log({
          nearby: this.getNearby(),
          nearbyIndex,
          selected: this.getNearby()[nearbyIndex].object
        })

        if (this.getNearby()) {
          if (this.getNearby().length <= nearbyIndex) {
            nearbyIndex = 0;
          }

          let selected = this.getNearby()[nearbyIndex].object;
          if (selected) {
            nearbyIndex++;
            this.widget.UI().target(selected, this.avatar)
          }
        }
        break;
      case "Digit1":
        let target = helpers.getSelected();
        let origin = this.avatar.position.clone();
        if(target) {
          IceLance.prototype.emit.apply(this, [uuid(), origin, target]);          
  
          this.ws.send(
            JSON.stringify({
              //target: target.toJSON(),
              origin: origin,
              timestamp: new Date().getTime() / 1000,
              type: "snowball"
            })
          );
        }

        break;
    }
  })
};

export default Keyboard;
