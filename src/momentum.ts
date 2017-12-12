
import Triangle from './triangle'
import Draw from './draw'
import Sprite from './sprite'
import { bindTextureToProgramUniformSampler } from 'deeplearn/dist/math/backends/webgl/webgl_util';

let { toRad } = Triangle()

const orange = 'rgba(241, 143, 1, 1)'
const blue = 'rgba(4, 139, 168, 1)'
const purple = 'rgba(46, 64, 87, 1)'
const green = 'rgba(153, 194, 77, 1)'
const brown = 'rgba(47, 45, 46, 1)'

function Momentum(params = {}) {
  const ctx : any = {
    frictionCoefficient: 0.95,
    body: {
      velocity: [0, 0],
      position: [200, 200], 
      forces: [],
      isColliding: false,
    },
    ...params
  }
  
  ctx.draw = Draw(params)
  ctx.root = document.getElementById('overlay')
  ctx.bodies = []

  const generateId = () => '_' + Math.random().toString(36).substr(2, 9);
  
  ctx.getPosition = () => ctx.body.position;

  ctx.watch = () => {
    if(ctx.body.isColliding) return

    const reset = () => setTimeout(function() {
      ctx.body.isColliding = false
    }, 1000);
    
    for(let body of ctx.bodies) {
      let { position } = ctx.body
      let center = [
        body.left + (body.width/2), 
        body.top + (body.height/2)
      ]
      let dx = center[0] - position[0]
      let dy = center[1] - position[1]
      let [h, angle] = Triangle().compose(dx, dy)
       
      if(Math.abs(h) < 5 && !ctx.body.isColliding) {
        let timer = reset()
        ctx.body.isColliding = true;
        
        let [force, θ] = ctx.body.netForce;

        let θN = (2 * Math.PI/2) - θ
        let fN = force
        let components1 = Triangle().decompose(force, θ)
        ctx.drawForceDiagram(components1[0], components1[1], brown)
        let components2 = Triangle().decompose(fN, θN)
        ctx.drawForceDiagram(components2[0], components2[1], green)

        ctx.register(2 * fN, θN)
      } 
    }
  }

  ctx.drawForceDiagram = (dx, dy, color) => {
    dx *= 100;
    dy *= 100;
    let [x1, y1] = ctx.body.position;
    let x2 = x1 + dx;
    let y2 = y1 + dy;
    
    let t = Triangle()
    let [h, theta] = t.compose(dx, dy)

    ctx.draw.color(color)
      .circle([x2, y2])
      .line([x1, y1, x2, y2])
      .line([x1, y1, x2, y2])
      .line([x1, y1, x2, y1])
      .line([x2, y2, x2, y1])
      .text([x1 + 10, y1 - 10], `θ = ${t.toDeg(theta)}`)
      .text([x1 + 10, y1 + 10], `(${Math.round(x1)}, ${Math.round(y1)})`)    
      .text([x2 + 10, y2 + 10], `(${Math.round(x2)}, ${Math.round(y2)})`)
    
    return ctx;
  }

  ctx.resolveForces = () => {
    let { forces } = ctx.body;
   
    if(forces.length < 1) return [0, 0]
   
    let components = forces.map(force => 
      Triangle().decompose(force[0], force[1])
    )

    let fx = components.reduce((acc, val) => acc + val[0], 0)
    let fy = components.reduce((acc, val) => acc + val[1], 0)

    return [fx, fy]
  }

  ctx.register = (force = 1, theta = Math.random() * 2 * Math.PI) => {
    //console.log('register',[force, theta])
    ctx.body.forces.push([force, theta])

    return ctx;
  }

  ctx.friction = (fr) => {
    ctx.frictionCoefficient = fr;

    return ctx;
  }

  ctx.clear = () => {
    ctx.body.forces = []
    return ctx;
  }

  ctx.getPosition = () => ctx.sprite.position

  ctx.apply = () => {
    ctx.frame = 0

    let step = (timestamp) => {
      let {
        forces
      } = ctx.body;      
      let [x1, y1] = ctx.getPosition() 
      ctx.body.position = [x1, y1]

      if(ctx.frame === 0) {
        //ctx.draw = ctx.draw.clear()
        //let [dx, dy] = ctx.resolveForces()
        //ctx.drawForceDiagram(dx, dy, orange)

      } else {
        ctx.body.forces = forces.map(force => [
          force[0] * ctx.frictionCoefficient,
          force[1]
        ]).filter(force => Math.abs(force[0]) > 0.05)
      }
      
      if(ctx.body.forces.length > 0) {
        ctx.frame++
        requestAnimationFrame(step)
        console.log(ctx)
        ctx.setPosition()
      } else {
        ctx.frameRate = ctx.frame;
        ctx.frame = 0;
      }
    }

    requestAnimationFrame(step)

    return ctx
  }

  ctx.clamp = () => {
    let frame = ctx.frame;
    let frameRate = 5;
    let rowsPerSpriteSheet = 8;

    let remainder = Math.round(frame/frameRate) % rowsPerSpriteSheet
    return remainder;
  }

  ctx.setPosition = () => {
    let [vx, vy] = ctx.resolveForces()
    let [h, theta] = Triangle().compose(vx, vy)

    ctx.body.velocity = [vx, vy]
    ctx.body.netForce = [h, theta]

    if(ctx.bodies.length > 0) ctx.watch()

    let x = ctx.body.position[0] + vx;
    let y = ctx.body.position[1] + vy;
    
    ctx.body.position = [x, y]   
    ctx.sprite.sheet[0] = ctx.clamp() 
    ctx.sprite.draw([x, y])
  }

  ctx.registerBody = (elem) => {
    //let rect = elem.getBoundingClientRect();
    //let {top, left, width, height} = rect;
    //let id = elem.id;
    //ctx.bodies.push({top, left, width, height, id})

    return ctx
  }

  ctx.random = () => {
    let randomTheta = () => Math.random() * 2 * Math.PI
    let theta = randomTheta()

    const registerForce = () => {
      ctx.register()
    }

    const timer = () => setTimeout(() => {
      registerForce()
      timer()
    }, 2000)
   
    timer()

    return ctx;
  }

  return ctx;
}

export default Momentum