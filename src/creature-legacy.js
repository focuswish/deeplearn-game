const momentum = (creature, nodes) => {
  const FRICTION_COEFF = 0.95;
  const BOUNCE = 0.2;
  let rect = creature.getBoundingClientRect()
  let creatureId = creature.id;

  let position = { x: rect.left, y: rect.top }
  let velocity = { x: 0, y: 0 }
  let start = null;
  let impulse = true;

  const step = (timestamp) => {
    
    if(!document.getElementById(creatureId)) return

    if (!start) start = timestamp;
    let progress = timestamp - start;

    if(progress < 2000) {
      requestAnimationFrame(step)
    } else {
      requestAnimationFrame(ctx.momentum(creature, nodes))
    }

    let monsterRect = document.getElementById('monster').getBoundingClientRect()
    
    let quadrant = () => {
      let isRight = position.x > monsterRect.left
      let isTop = position.y > monsterRect.top
      return {
        x: isRight ? -1 : 1,
        y: isTop ? -1 : 1
      }
    }

    let {x, y} = normalizePosition(position.x, position.y)

    let monster = {
      ...normalizePosition(
        monsterRect.left,
        monsterRect.top
      )
    }

    let predicted = ctx.predict([x, y, monster.x, monster.y])
    let expected = calculateHypotenuse([x, y, monster.x, monster.y])

    if(impulse) {
      impulse = false;
      //let sign = () => Math.floor(Math.random() * 2) === 0 ? -1 : 1
      let next = Math.floor(Math.random() * 20)

      velocity = {
        x: next * quadrant().x * predicted[0],
        y: next * quadrant().y * predicted[0]
      } 
      velocity.x *= FRICTION_COEFF;
      velocity.y *= FRICTION_COEFF;
    }

    position.x += velocity.x
    position.y += velocity.y
    
    predicted = predicted[0] * diagonal;
    expected *= diagonal;

    document.getElementById('predicted').innerHTML = Math.round(predicted) + ""
    document.getElementById('proximate').innerHTML = Math.round(expected) + ""

    //if(Math.round(predicted) === 0) {
      creature.style.transform = `translate(${position.x}px, ${position.y}px)` 
      creature.style.border = '0'     
    //} else {
    //  position.x += (-velocity.x * 3)
    //  position.y += (-velocity.y * 3)
    //  creature.style.transform = `translate(${position.x}px, ${position.y}px)`     
    //  creature.style.border = '1px dashed red'       
    //}

    //ctx.style(creature, predicted, proximate)
  }

  return step
}

const style = (creature, predicted, proximate) => {
    if(proximate) {
      creature.style.backgroundImage = 'linear-gradient(-90deg, #000000 0%, #434343 100%)'
      
      if(predicted !== 1) {
        document.getElementById('content').removeChild(creature)        
      } else {
        creature.style.boxShadow = '0px 2px 4px -1px rgba(0, 255, 0, 0.2), 0px 4px 5px 0px rgba(0, 255, 0, 0.14), 0px 1px 10px 0px rgba(0, 255, 0, 0.12)' 
      }
    }
  
}