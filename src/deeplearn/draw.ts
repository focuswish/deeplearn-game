function Draw(params = {}) {
  const draw : any = {
    ...params
  }

  draw.clear = () => {
    if(draw.canvas.getContext) {
      draw.context.clearRect(0, 0, window.innerWidth, window.innerHeight)
    } 
    return draw;
  }

  draw.color = (color) => {
    draw.context.fillStyle = color
    draw.context.strokeStyle = color
    draw.context.save()

    return draw
  }

  draw.line = (pos) => {
    if(draw.canvas.getContext) {
      let [x1, y1, x2, y2] = pos;
     
      draw.context.beginPath();
      draw.context.moveTo(x1, y1);
      draw.context.lineTo(x2, y2);
      draw.context.stroke();
    }
    return draw;
  }

  draw.circle = (pos, radius = 5) => {
    if(draw.canvas.getContext) {
      let [x, y] = pos;
  
      //ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
      
      draw.context.beginPath();
      draw.context.arc(x, y, radius, 0, Math.PI * 2); 
      //draw.context.stroke();
      draw.context.fill()
    }
    return draw;
  }

  draw.ellipse = (pos = [0, 0], radius = [15, 10]) => {

    let [x, y] = pos;
    let [radiusX, radiusY] = radius;
    let rotation = 0;
    let startAngle = 0;
    let endAngle = 2 * Math.PI;
    let anticlockwise = false;
    
    draw.context.beginPath()   
    draw.context.ellipse(
      x, 
      y, 
      radiusX, 
      radiusY, 
      rotation, 
      startAngle, 
      endAngle, 
      anticlockwise
    )

    draw.context.fill()

    return draw;
  }

  draw.text = (pos, text) => {
    if(draw.canvas.getContext) {
      let [x, y] = pos;
      
      draw.context.font = '12px serif';
      draw.context.fillText(text, x, y)
    }
    return draw;
  }

  draw.create = (x1, y1, w, h) => {
    draw.context.fillRect(x1, y1, w, h);

    return draw;
  }

  draw.translate = (x = 1, y = 1) => {
    let step = function() {
      // requestAnimationFrame(step)
      draw.context.save();

      x++
      y++
      draw.create(x, y, 10, 10)
      //draw.context.translate(x, y)
      draw.context.restore();
    }

    requestAnimationFrame(step)
    return draw;
  }



  return draw;
}

export default Draw;