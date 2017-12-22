import {
  NDArrayMathGPU,
  Array1D,  
  InCPUMemoryShuffledInputProviderBuilder,
  Tensor,
  Session,
  Graph,
  CostReduction,
  SGDOptimizer,
  Scalar
} from 'deeplearn'

import { sum, last, sample, shuffle } from 'lodash'
import * as serialize from 'deeplearn-graph-serializer'
import * as fetch from 'isomorphic-fetch'
import Momentum from './momentum'
import Triangle from './triangle'
import Draw from './draw'
import Sprite from './Sprite'
import * as Three from 'three'

function createFullyConnectedLayer(
  graph,
  inputLayer,
  layerIndex,
  sizeOfThisLayer,
) {
  return graph.layers.dense(
    `fully_connected_${layerIndex}`,
    inputLayer,
    sizeOfThisLayer,
    x => graph.relu(x)
  );
}

function createLayers(graph, inputTensor) {
   let layer = createFullyConnectedLayer(
     graph,
     inputTensor,
     0,
     64
   )
 
   layer = createFullyConnectedLayer(
     graph,
     layer,
     1,
     32
   )
 
   layer = createFullyConnectedLayer(
     graph,
     layer,
     2,
     16
   )
 
   return layer;
 }

 function rehydrate(tensors) {
  let ReLUNodes : any = Object.keys(tensors).filter(key => tensors[key].node.name === 'ReLU')

  return tensors[last(ReLUNodes)]
 }

function loadGraph() {
  let json = window.localStorage.getItem('data')
  
  if(json) {
    const net = serialize.jsonToGraph(JSON.parse(json))
    const { graph, placeholders, variables, tensors } = net
        
    //let predictionTensor
    return { 
      graph, 
      inputTensor: placeholders.input,
      targetTensor: placeholders.output,
      predictionTensor: rehydrate(tensors)
    }
  } 
  
  let g = new Graph()
  let inputTensor = g.placeholder('input', [4])
  let targetTensor = g.placeholder('output', [1])
  let predictionTensor = createFullyConnectedLayer(
    g,
    createLayers(g, inputTensor),
    4,
    1
  );

  return {
    graph: g,
    inputTensor,
    targetTensor,
    predictionTensor
  }
}

function Base() {
  let ctx : any = {}
  ctx.math = new NDArrayMathGPU();
  ctx.batchSize = 100;
  ctx.initialLearningRate = 0.1;
  ctx.optimizer = new SGDOptimizer(ctx.initialLearningRate)

  ctx.init = () => {    
    const model = loadGraph()

    ctx = { ...ctx, ...model }
  
    ctx.costTensor = ctx.graph.meanSquaredCost(
      ctx.targetTensor,
      ctx.predictionTensor
    )    
  
    ctx.session = new Session(ctx.graph, ctx.math);    

    return ctx;
  }

  ctx.createTrainingData = () => {    
    ctx.math.scope(() => {
      let inputArray = []
      let targetArray = []
      let size = 100000
      
      for(let i = 0; i < size; i++) {
        let t = Triangle().generate().calc()
        let {_x1, _y1, _x2, _y2, _theta} = t;

        inputArray.push(Array1D.new([_x1, _y1, _x2, _y2]))
        targetArray.push(Array1D.new([_theta]))
      }
    
      const shuffledInputProviderBuilder = new InCPUMemoryShuffledInputProviderBuilder(
        [inputArray, targetArray]
      );
    
      const [
        inputProvider,
        targetProvider
      ] = shuffledInputProviderBuilder.getInputProviders();
    
  
      ctx.entries = [
        { tensor: ctx.inputTensor, data: inputProvider },
        { tensor: ctx.targetTensor, data: targetProvider }
      ]; 
    })

    return ctx
  }

  ctx.trainBatch = (shouldFetchCost) => {
    let decay = Math.pow(0.85, Math.floor(step / 42))
    let adjustedLearningRate = ctx.initialLearningRate * decay
  
    ctx.optimizer.setLearningRate(
      adjustedLearningRate
    );

    let costValue = -1

    ctx.math.scope(() => {
      const cost = ctx.session.train(
        ctx.costTensor,
        ctx.entries,
        ctx.batchSize,
        ctx.optimizer,
        shouldFetchCost ? CostReduction.MEAN : CostReduction.NONE
      );
      
      if (!shouldFetchCost) {
        // We only train. We do not compute the cost.
        return
      }
      
      costValue = cost.get();
    })

    return costValue
  }

  ctx.predict = (input) => {
    let out = []
    ctx.math.scope(() => {
      const mapping = [{
        tensor: ctx.inputTensor,
        data: Array1D.new(input)
      }];
        
      let evalOutput = ctx.session.eval(
        ctx.predictionTensor, 
        mapping
      );
  
      const values = evalOutput.getValues();
      out = Array.prototype.slice.call(values)
    })

    return out
  }

  let step : any = window.localStorage.getItem('step') || 0;

  ctx.save = () => {
    const graphJson = serialize.graphToJson(ctx.graph)
    let body = JSON.stringify(graphJson)
    window.localStorage.setItem('data', body)
  }

  ctx.train = () => {
    //requestAnimationFrame(ctx.train);

    const localStepsToRun = 5;
    let cost;

    for (let i = 0; i < localStepsToRun; i++) {
      cost = ctx.trainBatch(i === localStepsToRun - 1);
      step++;
    }

    let t = Triangle().generate().calc()
    let {x1, y1, x2, y2, theta} = t;
    let predicted = ctx.predict([x1, y1, x2, y2]);
  

    //if(predicted !== 0) {
    //  ctx.save()
    //  window.localStorage.setItem('step', step)
    //}
  
    return ctx
  }

  return ctx;
}

declare global {
  interface Window { 
    ML: any; 
    Momentum: any; 
    Triangle : any; 
    Draw: any; 
    Sprite: any;
    THREE: any;
  }
}

window.ML = function() {
  let base = Base()
  base = base.init()
  base = base.createTrainingData()
  return base;
}

window.THREE = Three;
window.Momentum = Momentum;
window.Triangle = Triangle;
window.Draw = Draw;
window.Sprite = Sprite;