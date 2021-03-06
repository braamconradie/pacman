//環境變數
var updateFPS = 30
var showMouse = true
var time = 0
var bgColor ="black"

//控制
var controls = { 
  value: 0 
}
var gui = new dat.GUI()
gui.add(controls,"value",-2,2).step(0.01).onChange(function(value){})

let PI = n => n === undefined? Math.PI : Math.PI*n
//------------------------
// Vec2

class Vec2{
  constructor(x,y){
    this.x = x
    this.y = y
  }
  set(x,y){
    this.x =x
    this.y =y
  }
  setV(v){
    this.x=v.x
    this.y=v.y
  }
  move(x,y){
    this.x+=x
    this.y+=y
  }
  add(v){
    return new Vec2(this.x+v.x,this.y+v.y)
  }
  sub(v){
    return new Vec2(this.x-v.x,this.y-v.y)
  }
  mul(s){
    return new Vec2(this.x*s,this.y*s)
  }
  get length(){
    return Math.sqrt(this.x*this.x+this.y*this.y)
  }
  set length(nv){
    let temp = this.unit.mul(nv)
    this.set(temp.x,temp.y)
  }
  clone(){
    return new Vec2(this.x,this.y)
  }
  toString(){
    return `(${this.x}, ${this.y})`
  }
  equal(v){
    return this.x==v.x && this.y ==v.y
  }
  get angle(){
    return Math.atan2(this.y,this.x)  
  }
  get unit(){
    return this.mul(1/this.length)
  }
  static get ZERO(){
    return new Vec2(0, 0)
  }
  static get UP(){
    return new Vec2(0,-1)
  }
  static get DOWN(){
    return new Vec2(0,1)
  }
  static get LEFT(){
    return new Vec2(-1,0)
  }
  static get RIGHT(){
    return new Vec2(1,0)
  }
  static DIR(str){
    if (!str) {
      return this.ZERO
    }
    let type = (""+str).toUpperCase()
    return this[type]
  }
  static DIR_ANGLE(str){
    switch(str){
      case "right":
        return 0
      case "left":
        return PI()
      case "up":
        return PI(-0.5)
      case "down":
        return PI(0.5)
    }
    return 0
  }
  
  
}

//------
var canvas = document.getElementById("mycanvas")
var ctx = canvas.getContext("2d")
circle= function(v,r){
  ctx.arc(v.x,v.y,r,0,PI(2))
}
line= function(v1,v2){
  ctx.moveTo(v1.x,v1.y)
  ctx.lineTo(v2.x,v2.y)
}

let getVec2 = (args)=>{
  if (args.length==1){
    return args[0]
  }else if (args.length==2){
     return new Vec2(args[0],args[1])
  }
}

let moveTo = function(){
  let v = getVec2(arguments)
  ctx.moveTo(v.x,v.y)
}
let lineTo = function(){
  let v = getVec2(arguments)
  ctx.lineTo(v.x,v.y)
}
let arc = function(){
  ctx.arc.apply(ctx,arguments)
}
let rotate = (angle)=>{
  if(angle!=0){
    ctx.rotate(angle) 
  }
}
let translate = function(){
  let v = getVec2(arguments)
  ctx.translate(v.x,v.y)
}
let beginPath = ()=>{ctx.beginPath()}
let closePath = ()=>{ctx.closePath()}
let setFill = (color)=>{ ctx.fillStyle=color }
let setStroke = (color)=>{ ctx.strokeStyle=color }
let fill = (color)=>{
  if(color){
    setFill(color)
  }
  ctx.fill()
}
let stroke = (color)=>{
  if(color){
    ctx.strokeStyle=color
  }
  ctx.stroke()
}
let save = (func,func2)=>{
  ctx.save()
  func()
  if (func2) func2()
  ctx.restore()
}



function initCanvas(){
  ww = canvas.width = window.innerWidth
  wh = canvas.height = window.innerHeight
}
initCanvas()

//定義格子大小跟如何取得位置
const WSPAN = Math.min(ww,wh)/24
function GETPOS(i,o){
  let sourceV = (typeof i == 'object')?i:(new Vec2(i,o))
  return sourceV
          .mul(WSPAN)
          .add(new Vec2(WSPAN/2,WSPAN/2))
}

//定義遊戲內物件原型
class GameObject{
  constructor(args){    
    let def = {
      p: new Vec2(0,0),
      gridP: new Vec2(1,1),
    }
    Object.assign(def,args)
    Object.assign(this,def)
    this.p = GETPOS(this.gridP)
  }
  collide(gobj){
    return this.p.sub(gobj.p).length < WSPAN
  }
  
}

class Food extends GameObject{
  constructor(args){  
    super(args)  
    let def = {
      eaten: false,
      super: false 
    }
    Object.assign(def,args)
    Object.assign(this,def)
  }
  draw(){
    if (!this.eaten){
      beginPath()
      setFill("#f99595")
      if (this.super){
        //閃爍
        if (time%20<10){
          setFill("white")
          arc(this.p.x,this.p.y,WSPAN/5,0,PI(2))
          fill()  
        }
      }else{
        ctx.fillRect(this.p.x-WSPAN/10,this.p.y-WSPAN/10,WSPAN/5,WSPAN/5)
      } 
    }
  }
  
}

class Player extends GameObject{
  constructor(args){    
    super(args)
    let def = {
      nextDirection: null,
      currentDirection: null,
      moveTimer: null,
      moving: false,
      speed: 40
    }
    Object.assign(def,args)
    Object.assign(this,def)
  }
  draw(){
    beginPath()
    setFill("white")
    circle(this.p,5)
    fill()
  }
  get direction(){ 
    return Vec2.DIR_ANGLE(this.currentDirection)
  }
  
  moveStep(){
    //處理移動
    let [i0,o0] = [this.gridP.x,this.gridP.y]
    let oldDirection = this.currentDirection
    
    let haveWall = map.getWalls(this.gridP.x,this.gridP.y)
    //查看能移動的方向
    let avail = Object.keys(haveWall).map(d=>({name: d , wall: haveWall[d]})) 
          .filter(f=>!f.wall).map(f=>f.name) 
    //沒有牆 或不在場外就更新方向
    if (!haveWall[this.nextDirection]){
      this.currentDirection=this.nextDirection   
    }
    //根據方向更新位置
    this.gridP=this.gridP.add(Vec2.DIR(this.currentDirection))
    
    let isWall = map.isWall(this.gridP.x,this.gridP.y)
    if (!isWall){
      this.isMoving=true
      let ttime = 10/this.speed
      
      //如果在左右邊界
      if (this.gridP.x<=-1 &&  this.currentDirection=='left'){
        this.gridP.x=18
        ttime=0 
      }
      if (this.gridP.x>=19 && this.currentDirection=='right'){
        this.gridP.x=0
        ttime=0
      } 
      
      //製作移動
      TweenMax.to(this.p,ttime,{
        ...GETPOS(this.gridP),
        ease: Linear.easeNone,
        onComplete: ()=>{
          this.isMoving=false
          this.moveStep()
        }} )
      return true
    }else{
      //如果下一個方向是墻就倒退回原始位置，維持原始方向前進
      this.gridP.set(i0,o0)   
      this.currentDirection = oldDirection
      this.moveTimer=null 
    }

  }
}
 
class Pacman extends Player{
  constructor(args){
    super(args)
    let def = {
      deg: Math.PI/4,
      r: 50,
      deadDeg: null,
      isDead: false
    }
    Object.assign(def,args)
    Object.assign(this,def)
  }
  update(){
    if (this.isDead){
      this.isMoving=false
    }
  }
  draw(){
    let useDeg = Math.PI/4
    if (this.isMoving){
      useDeg = this.deg
    }
    if (this.deadDeg){
      useDeg = this.deadDeg
    }
    save(()=>{
      translate(this.p)
      rotate(this.direction)
      let p1 = new Vec2(Math.cos(useDeg),Math.sin(useDeg)).mul(this.r)
      let p2 = new Vec2(Math.cos(-useDeg),Math.sin(-useDeg)).mul(this.r)
      moveTo(Vec2.ZERO)
      lineTo(p1) 
      arc(0,0,this.r,useDeg,2*Math.PI-useDeg)
      lineTo(p2) 
      closePath()
      
      setFill("yellow")
      fill()
    })
   
  }
  die(){
    if (!this.isDead){
      //重置所有動畫
      TweenMax.killAll()
      this.isDead=true
      this.deadDeg=Math.PI
      //張開嘴
      TweenMax.from(this,1.5,{
        deadDeg: 0,
        ease: Linear.easeNone,
        delay: 1
      })
      
    }
  }
}
class Ghost extends Player{
  constructor(args){
    super(args)
    let def = {
      r: 50,
      color: "red",
      isEatable: false,
      isDead: false,
      eatableCounter: 0,
      traceGoCondition: [ 
        {
          name: 'left', condition:(target)=> (this.gridP.x>target.x),  
        }, 
        {
          name: 'right', condition:(target)=> (this.gridP.x<target.x),
        },
        {
          name: 'up', condition:(target)=> (this.gridP.y>target.y),
        },
        {
          name: 'down', condition:(target)=> (this.gridP.y<target.y)  
        },
      ]   
    }
    Object.assign(def,args)
    Object.assign(this,def)
  } 
  update(){
    this.speed=38
    if (this.isEatable)  this.speed=25
    if (this.isDead) this.speed=80
    if (this.isDead && this.gridP.equal(new Vec2(9,9)) ){
      this.reLive()
    }
  }
  draw(){
    save(()=>{
      ctx.translate(this.p.x,this.p.y)
    
      if (!this.isDead){
        beginPath()
        //身體上半
        arc(0,0,this.r,PI(),0)
        ctx.lineTo(this.r,this.r)
        
        let tt = parseInt(time/3)
        let ttSpan = this.r*2/7
        let ttHeight = this.r/3
        //鋸齒狀
        for(var i=0;i<7;i++){
          ctx.lineTo(this.r*0.9-ttSpan*i,this.r+((i+tt)%2)*-ttHeight)
        }
        ctx.lineTo(-this.r,this.r)
        setFill( !this.isEatable?this.color:((time%10<5 || this.isEatableCounter>3)?"#1f37ef":"#fff"))
        fill()
      }
      
      let hasEye = !this.isEatable || this.isDead
    
      if (hasEye){
        //eye shape
        beginPath()
        arc(-this.r/2.5,-this.r/3,this.r/3,0,PI(2))
        arc(this.r/2.5,-this.r/3,this.r/3,0,PI(2))
        setFill("white")
        fill()
        
      }
      
      //畫上眼球
      save(()=>{
        beginPath()
        let eyePan = (Vec2.DIR(this.currentDirection)).mul(2)
      
        translate(eyePan) 
        arc(-this.r/2.5,-this.r/3,this.r/6,0,PI(2))
        arc(this.r/2.5,-this.r/3,this.r/6,0,PI(2))
        setFill( hasEye ?"black":"white")
        fill()
      }) 
    
    }) 
  }
  getNextDirection(map,pacman){
    let currentTarget = this.isDead?(new Vec2(9,9)):pacman.gridP 
    let go = !this.isEatable || this.isDead
        
    //留下應該前進的方向
    let traceGo = this.traceGoCondition.filter(obj=> {
      let cond = obj.condition(currentTarget) 
      return go? cond:!cond
    }).map(obj=>obj.name) 
    
    ///取得可走的方向
    let haveWall = map.getWalls(this.gridP.x,this.gridP.y)
    
    //過濾可以前進且應該前進的方向與反方向
    let traceGoAndCanGo = traceGo
        .filter(o=>!haveWall[o] )
        .filter(nn=>
          Vec2.DIR(nn).add(Vec2.DIR(this.currentDirection) ).length!=0
        )
    
    //過濾可走的方向
    let availGo = Object.keys(haveWall)
      .map(d=>({name: d , wall: haveWall[d]})) 
      .filter(f=>!f.wall).map(f=>f.name) 
    
    //如果當下只有兩個方向，維持原本進行
    if (availGo.length==2){
      if ((haveWall.up && haveWall.down) || 
          (haveWall.left && haveWall.right) ){
        return this.currentDirection
      }
    }
    
    //優先走該走方向，如果無就從可走方向挑
    let finalPossibleSets = traceGoAndCanGo.length?traceGoAndCanGo:availGo
    let finalDecision = finalPossibleSets[ parseInt(Math.random()*finalPossibleSets.length) ] || 'top' 
    return finalDecision
  }
  die(){
    this.isDead=true
  }
  reLive(){
    this.isDead=false
    this.isEatable=false 
  }
  setEatable(time){
    this.isEatable=true
    //設定倒數計時
    this.isEatableCounter=time
    let func = (()=>{
      this.isEatableCounter--
      if (this.isEatableCounter<=0){
        this.isEatable=false
      }else{
        setTimeout(func,1000) 
      }
    })
    func()
  }
}
class Map {
  constructor(){
    this.mapData =  [
      "ooooooooooooooooooo",
      "o        o        o",
      "o oo ooo o ooo oo o",
      "o+               +o",
      "o oo o ooooo o oo o",
      "o    o   o   o    o", 
      "oooo ooo o ooo oooo",
      "xxxo o       o oxxx",
      "oooo o oo oo o oooo", 
      "       oxxxo       ",
      "oooo o ooooo o oooo",
      "xxxo o   x   o oxxx",
      "oooo ooo o ooo oooo",
      "o    o   o   o    o",
      "o oo o ooooo o oo o",
      "o+               +o",
      "o oo ooo o ooo oo o",
      "o        o        o",
      "ooooooooooooooooooo",
    ]
    this.init()
  }
  init(){
    this.pacman = new Pacman({
      gridP: new Vec2(9,11),
      r: WSPAN/2
    })
    
    this.ghosts = Array.from({length: 4},(d,i)=>
      new Ghost({
        gridP: new Vec2(9+i%2,9), 
        r: WSPAN/2*0.9, 
        color: ["red","#ffa928","#16ebff","#ff87ab"][i%4]
      })
    )
    
    this.foods=[]
    for(let i=0;i<19;i++){
      for(let o=0;o<19;o++){
        if (this.getWalls(i,o).none){
          let foodType=this.isFood(i,o)
          if (foodType){
            let food = new Food({
              p: GETPOS(i,o),
              gridP: new Vec2(i,o),
              super: foodType && foodType.super
            })
            this.foods.push(food)
          }
        } 
      }
    }
    
TweenMax.to(this.pacman,0.15,{deg: 0,ease: Linear.easeNone,repeat: -1,yoyo: true})
  }
  
  draw(){
    for(let i=0;i<19;i++){
      for(let o=0;o<19;o++){
        save(()=>{
          translate(GETPOS(i,o)) 
          
          ctx.strokeStyle="rgba(255,255,255,0.5)"
          // ctx.strokeRect(-WSPAN/2,-WSPAN/2,WSPAN,WSPAN)  
          let walltype = this.getWalls(i,o)
          setStroke("blue")
          ctx.shadowColor = "rgba(30,30,255)"
          ctx.shadowBlur = 30
          ctx.lineWidth=WSPAN/5

          let typecode =  ['up','down','left','right']
              .map(d=>walltype[d]?1:0)
              .join("")
          typecode=walltype.none?"":typecode
          
          let wallSpan = WSPAN / 4.5
          let wallLen = WSPAN / 2

          if (typecode =="1100" || typecode=="0011"){
            if (typecode == "0011"){
              rotate(PI(0.5))
            }
            save(()=>{
              beginPath()
              moveTo(wallSpan,-wallLen)
              lineTo(wallSpan,wallLen)
              moveTo(-wallSpan,-wallLen)
              lineTo(-wallSpan,wallLen)
              stroke()
            })
          }else if ( (typecode.match(/1/g) || []).length==2 ){
            let angles = {
              '1010': 0, '1001': 0.5,
              '0101': 1, '0110': 1.5
            }
            save(()=>{
              rotate( PI(angles[typecode]) )
              beginPath()
              arc(-wallLen,-wallLen,wallLen+wallSpan,0,PI(0.5))
              stroke()
              beginPath()
              arc(-wallLen,-wallLen,wallLen-wallSpan,0,PI(0.5))
              stroke()
              
            })
          }
          if ( (typecode.match(/1/g) || []).length==1 ){
            let angles = {
              '1000': 0, '0001': 0.5,
              '0100': 1, '0010': 1.5
            }
            save(()=>{
               rotate( PI(angles[typecode]) )
              beginPath()
              arc(0,0,wallSpan,0,PI())
              stroke()

              beginPath()
              moveTo(wallSpan, -wallLen)
              lineTo(wallSpan, 0)
              moveTo(-wallSpan, -wallLen)
              lineTo(-wallSpan, 0)
              stroke()
            })
          }
          if ((typecode.match(/1/g) || []).length==3){
            let angles = {
              '1011': 0, '1101': 0.5,
              '0111': 1, '1110': 1.5
            }
            save(()=>{
               rotate( PI(angles[typecode]) )
               
              beginPath()
              arc(-wallLen,-wallLen,wallLen-wallSpan,0,PI(0.5))
              stroke()
              
              beginPath()
              arc(wallLen,-wallLen,wallLen-wallSpan,-PI(1.5),-PI(1))
              stroke()
              
              beginPath()
              moveTo(-wallLen,wallSpan)
              lineTo(wallLen,wallSpan)
              stroke()
            })
            
          }
          
        })
      }
    }
  }
  getWallContent(o,i){
    //map array and reverse direction
    return this.mapData[i] && this.mapData[i][o]
  }
  isWall(i,o){
    let type = this.getWallContent(i,o)
    return type=="o"
  }
  isFood(i,o){
    let type = this.getWallContent(i,o)
    if (type=="+" || type==" "){
      return {
        super: type=="+"
      }
    }
    return false
    
  }
  getWalls(i,o){   
    return {
      up: this.isWall(i,o-1),
      down: this.isWall(i,o+1),
      left: this.isWall(i-1,o),
      right: this.isWall(i+1,o),
      none: !this.isWall(i,o)
    }
  }
}

var map
function init(){
  map = new Map()
}

function update(){
  time++
    
  map.ghosts.forEach(ghost=>{
    ghost.update()
    
    //鬼魂遊走策略
    ghost.nextDirection=ghost.getNextDirection(map,map.pacman)
    if (!ghost.isMoving){ 
      ghost.moveStep() 
    }
    //如果有碰撞
    if (!ghost.isDead && !map.pacman.isDead && ghost.collide(map.pacman)){
      if (!ghost.isEatable){
        //鬼吃小精靈
        map.pacman.die()
        setTimeout(()=>{
          map.init()
        },4000)
      }else if (!map.pacman.isDead){
        //小精靈吃鬼
        ghost.die()
        //暫停
        TweenMax.pauseAll()
        setTimeout(()=>{
          TweenMax.resumeAll()
        },500)
      }
    }

  }) 
  
  
  //吃食物判斷 檢查最近的幾顆
  let currentFood = map.foods.find(food=>
        food.gridP.sub(map.pacman.gridP).length<=3 && 
        food.p.sub(map.pacman.p).length<=WSPAN/2 )
  
  //檢查是否可以吃
  if (currentFood && !currentFood.eaten){ 
    currentFood.eaten=true
    //超級食物
    if (currentFood.super){
      //沒死的鬼變成可以吃
      map.ghosts.filter(ghost=>!ghost.isDead)
        .forEach(ghost=>{
          ghost.setEatable(12)
        })
    }
  }
}


function draw(){
   //清空背景
  setFill(bgColor)
  ctx.fillRect(0,0,ww,wh)
  
  //-------------------------
  //   在這裡繪製
  
  save(()=>{
    translate(ww/2-WSPAN*10,wh/2-WSPAN*10)
    map.draw()
    map.foods.forEach(food=>food.draw())
    map.pacman.draw()
    map.ghosts.forEach(ghost=>ghost.draw())
    setFill('white')
    ctx.font="20px Ariel"

    ctx.fillText("Score: "+ map.foods.filter(f=>f.eaten).length*10,0,-10)
  })
  
  //----------------------- 
  //繪製滑鼠座標
  
  setFill("red")
  beginPath()
  circle(mousePos,2)
  fill()
  
  save(()=>{
    beginPath()
    translate(mousePos)
    setStroke("red")
    let len = 20
    line(new Vec2(-len,0),new Vec2(len,0))
    line(new Vec2(0,-len),new Vec2(0,len))
    ctx.fillText(mousePos,10,-10)
    stroke()
  })
  
  //schedule next render
  requestAnimationFrame(draw)
}
function loaded(){
  initCanvas()
  init()
  requestAnimationFrame(draw)
  setInterval(update,1000/updateFPS)
}
window.addEventListener("load",loaded)
window.addEventListener("resize",initCanvas)

//滑鼠事件跟紀錄
var mousePos = new Vec2(0,0)
var mousePosDown = new Vec2(0,0)
var mousePosUp = new Vec2(0,0)

window.addEventListener("mousemove",mousemove)
window.addEventListener("mouseup",mouseup)
window.addEventListener("mousedown",mousedown)
function mousemove(evt){
  mousePos.setV(evt)
  // console.log(mousePos)
}
function mouseup(evt){
  mousePos.setV(evt)
  mousePosUp = mousePos.clone()
}
function mousedown(evt){
  mousePos.setV(evt)
  mousePosDown = mousePos.clone()
}

window.addEventListener("keydown",function(evt){
  //設定小精靈方向
  if (!map.pacman.isDead){
    map.pacman.nextDirection=evt.key.replace("Arrow","").toLowerCase()
    if (!map.pacman.isMoving){
      map.pacman.moveStep()
    }
  }
})