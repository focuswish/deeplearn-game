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
import * as sentiment from 'sentiment'
import words from './words'

let items = words.filter(w => 
  sentiment(w).score && (sentiment(w).score >= 1 || sentiment(w).score <= -1)
)

items = items.concat(items)
items = items.concat(items)
items = items.concat(items)
items = items.concat(items)

items = shuffle(items)

function prepareText(text) { 
  let values = text.split('').slice(0, 12).map(l => l.charCodeAt(0) / 255)
  let empty = new Array(12 - values.length)
  empty.fill(0)
  return values.concat(empty)
}

function normalizeSentiment(word) {
  return sentiment(word).positive.length > 0 ? 1 : 0
}

let randomBool = (n = 3) => {
  let arr = new Array(n)
  arr.fill(n)
  return arr.map(() => Math.floor(Math.random() * 2))
}

let expected = input => sum(input) >= 2 ? 1 : 0

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
  let inputTensor = g.placeholder('input', [12])
  let targetTensor = g.placeholder('output', [1])
  let predictionTensor = createFullyConnectedLayer(
    g,
    createLayers(g, inputTensor),
    12,
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
  ctx.STOPPED = false;

  ctx.init = () => {
    // const net = serialize.jsonToGraph(data)
    // const { graph, placeholders, variables, tensors } = net

    //ctx.graph = net.graph;
    const model = loadGraph()

    ctx = { ...ctx, ...model }
    
    // This tensor contains the input. In this case, it is a scalar.
    // ctx.inputTensor = ctx.graph.placeholder('input', [3]);
  
    // This tensor contains the target.
    // ctx.targetTensor = ctx.graph.placeholder('output', [1]);
  
    ctx.costTensor = ctx.graph.meanSquaredCost(
      ctx.targetTensor,
      ctx.predictionTensor
    )    
  
    ctx.session = new Session(ctx.graph, ctx.math);    

    return ctx;
  }

  ctx.createTrainingData = () => {
    ctx.math.scope(() => {

      let template = {
        sleep: 1,
        exercise: 1,
        diet: 1
      }

      let inputArray = []
      let targetArray = []
      let size = items.length

      for(let i = 0; i < size; i++) {
        //let input = randomBool()
        //let n = expected(input)
        let word = sample(items)

        
        let input = prepareText(word)
        let n = normalizeSentiment(word)

        inputArray.push(Array1D.new(input))
        targetArray.push(Array1D.new([n]))
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
    let adjustedLearningRate = ctx.initialLearningRate * Math.pow(0.85, Math.floor(step / 100))
  
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
        return;
      }

      // Compute the cost (by calling get), which requires transferring data
      // from the GPU.
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

  ctx.denormalize = () => {}

  ctx.save = () => {
    const graphJson = serialize.graphToJson(ctx.graph)
    let body = JSON.stringify(graphJson)
    window.localStorage.setItem('data', body)
    //fetch('/save', {
    //  method: 'POST',
    //  headers: {
    //    'Content-Type': 'application/json'
    //  },
    //  body,
    //})
  }

  ctx.train = () => {
    //if (step > 1000) {
    //  
    //}

    if(ctx.STOPPED) return
    // Schedule the next batch to be trained.
    requestAnimationFrame(ctx.train);
  
    // We only fetch the cost every 5 steps because doing so requires a transfer
    // of data from the GPU.
    const localStepsToRun = 5;
    let cost;

    for (let i = 0; i < localStepsToRun; i++) {
      cost = ctx.trainBatch(i === localStepsToRun - 1);
      step++;
    }

    // Print data to console so the user can inspect.
    //let input = randomBool()
    //let actual = expected(input)
  
    let w = sample(items)
    let input = prepareText(w)
    let actual = normalizeSentiment(w)
    let predicted = ctx.predict(input);

    //let color1 = actual === 0 ? 'red' : 'green'
    //let color2 = predicted <= 0.5 ? 'red' : 'green'
    let result = actual === Math.round(predicted) ? 'pass' : 'fail'
    //console.log(`--- step ${step - 1} ---`)
    //console.log('input', input)
    //console.log('expected', actual)
    //console.log('predicted', predicted)

    let el = document.querySelector('#content')
    el.innerHTML += `<div class="tile ${result}" data-predicted="${predicted}" data-input="${input}" data-expected="${actual}">${Math.round(predicted * 100)}<br />${w}</div>`
    //el.innerHTML += `--- STEP ${step - 1} ---<br />`;
    //el.innerHTML += `input: <span style="color: ${color1};">${input}</span><br />`;
    //el.innerHTML += `predicted: <span style="color: ${color2};">${predicted}</span><br /><br />`;

    if(predicted !== 0) {
      ctx.save()
      window.localStorage.setItem('step', step)
    } else {
      //
    }
  
    return ctx
  }

  ctx.start = () => {
    ctx.STOPPED = false;
    return ctx;
  }

  ctx.stop = () => {
    ctx.STOPPED = true;
    return ctx;
  }

  return ctx;
}

declare global {
  interface Window { ML: any; }
}

window.ML = function() {
  const run = () => {
    let base = Base()
    base = base.init()
    base = base.createTrainingData()
    base = base.train()
    return base;
  }

  return { run }
}