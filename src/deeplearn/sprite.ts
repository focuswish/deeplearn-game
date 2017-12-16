import Momentum from './momentum'
import Triangle from './Triangle'
import Draw from './Draw'

function Terrain() {
  const terrain = {
    src: 'https://cdn.pbrd.co/images/GXJNtaz.png'
  }

  return terrain;
}

function Sprite(params = {}) {
  //const canvas : any = document.getElementById('canvas')
  //const context = canvas.getContext('2d')

  const sprite : any = {
    position: [
      window.innerWidth/2, 
      window.innerHeight/2
    ],
    width: 64,
    height: 64,
    sheet: [0, 0],
    shadow: {
      radius: [75, 50]
    },
    src: 'http://madmarcel.github.io/yoas/res/img/sprites/full-characters/student_a.png',
    ...params
  }

  sprite.dropShadow = () => {
    let { canvas, context } = sprite;
    let draw = Draw({canvas, context})

    return function() {    

      if(sprite.shadow.shrink) {
        sprite.shadow.radius[0]--
        sprite.shadow.radius[0]++
      }

      if(sprite.shadow.grow) {
        sprite.shadow.radius[0]--
        sprite.shadow.radius[0]++
      }
      
      let radius = [
        Math.round(sprite.shadow.radius[0] / 5),
        Math.round(sprite.shadow.radius[1] / 5)
      ]

      draw.color('rgba(0, 0, 0, 0.3)').ellipse([
        sprite.position[0] + (sprite.width / 2),
        sprite.position[1] + sprite.height
      ], radius)
    }
  }

  sprite.render = () => {
    if(sprite.canvas.getContext) {
      console.log(sprite)
      sprite.context.drawImage(
        sprite.terrain,
        0,
        0,
        1400,
        1050,
        0,
        0,
        window.innerWidth,
        window.innerHeight
      )
    }
  
    return sprite;
  }

  sprite.draw = (position = [0, 0]) => {
    
    sprite.position = position;

    if(sprite.position[1] < -50) {
      sprite.position[1] = window.innerHeight
    }

    if(sprite.position[0] < -50) {
      sprite.position[0] = window.innerWidth;
    }

    //sprite.context.clearRect(0, 0, window.innerWidth, window.innerHeight)

    let params : any = {}
    let sWidth = 64;
    let sHeight = 64;

    //let clamp = sprite.sheet.shrink || sprite.sheet.grow;
    
    params.image = sprite.image;
    params.sx = sprite.sheet[0] * sWidth
    params.sy = sprite.sheet[1] * sHeight
    params.sWidth = sprite.width;
    params.sHeight = sprite.height;
    params.dx = sprite.position[0]
    params.dy = sprite.position[1]
    params.dWidth = sprite.width;
    params.dHeight = sprite.height;
    
    //sprite.context.globalAlpha = 0.9
    
    //sprite.render()

    let shadow = sprite.dropShadow()
    shadow()
    sprite.context.drawImage(
      ...Object.keys(params).map(k => params[k])
    )  

    return sprite;
  }

  sprite.load = (src, key) => {
    let img = new Image()
    return new Promise((resolve, reject) => {
      img.onload = function() {
        resolve(this)
      }
      img.src = src;
    })
  }

  sprite.keydown = (momentum) => {
    sprite.shadow.grow = null;
    sprite.shadow.shrink = null;
    sprite.shadow.radius = [75, 50]

    let toRad = Triangle().toRad
    let rad = {
      right: toRad(0),
      down: toRad(90),
      left: toRad(180),
      up: toRad(270)
    }

    let force = 3;
    let keydown = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    }
    momentum.clear()

    window.addEventListener('keydown', function(e) {
      console.log('KEYDOWN 1')
      momentum.friction(1)

        console.log('KEYDOWN 2')
        switch (e.code) {
          case 'ArrowUp':
            if(!keydown.ArrowUp) {
              keydown.ArrowUp = true;
              sprite.sheet = [0, 0]
              momentum.register(force, rad.up).apply()
            }
            
            break
          case 'ArrowRight':
            if(!keydown.ArrowRight) {
              keydown.ArrowRight = true;
              sprite.sheet = [0, 3]
              momentum.register(force, rad.right).apply()
            }
            break;
          case 'ArrowDown':
            if(!keydown.ArrowDown) {
              keydown.ArrowDown = true;
              sprite.sheet = [0, 2]
              momentum.register(force, rad.down).apply()
            }
            break
          case 'ArrowLeft':
            if(!keydown.ArrowLeft) {
              keydown.ArrowLeft = true;
              sprite.sheet = [0, 1]
              momentum.register(force, rad.left).apply()
            }
            
            break;
          case 'Space':
            let ground = sprite.position[1];

            sprite.sheet[0] = 0;
            sprite.shadow.shrink = true;
            momentum.friction(0.9).register(10, rad.up).apply(sprite.sheet)
            setTimeout(function() {
              sprite.shadow.shrink = null;
              sprite.shadow.grow = true;
              momentum.register(7, rad.down).apply(sprite.sheet)
            }, 300)
          default:
        }
    })

    window.addEventListener('keyup', function(e) {
      console.log('KEYUP')
      console.log(e)
      if(keydown[e.code]) {
        keydown[e.code] = false
        momentum.clear()
      }
      //console.log(e)
      //register = momentum.friction(0.8).register;
    })

    return sprite;
  }

  sprite.create = async () => {
    let terrain = Terrain()
    //sprite.terrain = await sprite.load(terrain.src)
    sprite.image = await sprite.load(sprite.src)
    
    let momentum = Momentum({
      sprite,
      context: sprite.context,
      frictionCoefficient: 1
    })
    sprite.keydown(momentum)
    
    //sprite.render()

    return sprite;
  }


  return sprite;
}

export default Sprite;