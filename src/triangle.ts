

//let theta = Math.atan(dy/dx)
//theta = toDeg(theta)

function Triangle() {
  const ctx : any = {}

  ctx.toRad = (deg) => (deg * 2 * Math.PI) / 360

  ctx.toDeg = (rad) => (rad * 360) / (2 * Math.PI)

  ctx.denormalize = (x, y) => [
    x * window.innerWidth, y * window.innerHeight,
  ]

  ctx.normalizeRad = (rad) => rad / 2 * Math.PI 

  ctx.denormalizeRad = (rad) => rad * 2 * Math.PI 

  ctx.compose = (dx, dy) => {
    let theta = Math.atan(dy/dx)
    let h = dy / Math.sin(theta)
    return [h, theta]
  }

  ctx.decompose = (h, rad) => {
    let y = Math.sin(rad) * h
    let x = Math.cos(rad) * h
      
    return [x, y]
  }

  ctx.generate = (n = 2) => {
    let positions = new Array(n * 2)
    positions.fill(0)
    positions = positions.map(() => Math.random())

    let [_x1, _y1, _x2, _y2] = positions;

    ctx._dx = _x2 - _x1;
    ctx._dy = _y2 - _y1;

    ctx._x1 = _x1;
    ctx._y1 = _y1;
    ctx._x2 = _x2;
    ctx._y2 = _y2;
    
    return ctx;
  }

  ctx.calc = () => {
    let {
      _x1,
      _y1,
      _x2,
      _y2,
      _dx,
      _dy,
    } = ctx;

    let [_h, _theta] = ctx.compose(_dx, _dy)

    ctx._h = _h
    ctx.theta = _theta;
    ctx._theta = ctx.normalizeRad(_theta);
    
    let [x1, y1] = ctx.denormalize(_x1, _y1)
    let [x2, y2] = ctx.denormalize(_x2, _y2)

    let [h, theta] = ctx.compose(x2 - x1, y2 - y1)
    ctx.h = h

    ctx.x1 = x1;
    ctx.y1 = y1;
    ctx.x2 = x2;
    ctx.y2 = y2;
     
    return ctx;
  }

  return ctx;
}

export default Triangle