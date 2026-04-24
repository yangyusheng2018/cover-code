import { useState } from "react";
import { describeScore } from "./utils";

export function App(): JSX.Element {
  const [score, setScore] = useState(0);
  const [count, setCount] = useState(0);
  const bump = () => {
    console.log('测试率')
    console.log('插入测试行1');
    console.log('插入测试行2');
    console.log('插入测试行3');
    console.log('插入测试行4');
    if(score > 5){
      console.log('score > 5');
      console.log('score > 5');
      console.log('score > 5');
      console.log('插入测试行1');
      console.log('插入测试行');
      console.log('score > 5');
      console.log('score > 5');
      console.log('score > 5');
    }else{
      console.log('score <= 5');  
      console.log('score <= 5');  
      console.log('score <= 5'); 
      console.log('插入测试行');
      console.log('插入测试行1111');
      console.log('插入测试行'); 
      console.log('score <= 5');  
      console.log('score <= 5');  
      console.log('score <= 5');  
      console.log('score <= 5');  
    }
    setScore((s) => s + 1);
  };
  const addCount = () => {
    console.log('add')
    if(count > 5){
      console.log('count > 5');
      console.log('count > 5');
      console.log('count > 5');
      console.log('count > 5');
      console.log('count > 5');
      console.log('count > 5');
    }else{
      console.log('count <= 5');  
      console.log('count <= 5');  
      console.log('count <= 5');  
      console.log('count <= 5');  
      console.log('count <= 5');  
      console.log('count <= 5');  
      console.log('count <= 5');  
    }
    setCount((c) => c + 1);
  };
  const nouse=()=>{
    console.log('nouse')
  }
  const label = describeScore(score);

  return (
    <main style={{ fontFamily: "system-ui", padding: 24, maxWidth: 640 }}>
      <h1>webpack + React + TS 覆盖率演示</h1>
      <p>
        分数：<strong>{score}</strong> — {label}
      </p>
      <button type="button" onClick={bump}>
        +1
      </button>
      <button type="button" onClick={addCount}>count +1 {count}</button>
      {score > 5 ? (
        <p data-testid="high">
          <div>已大于 5</div>
          <div>已大于 5</div>
          <div>已大于 5</div>
          <div>已大于 5</div>
          <div>已大于 5</div>
          <div>已大于 5</div>
          <div>已大于 5</div>
          <div>已大于 5</div>
        </p>
      ) : (
        <p data-testid="low">
          <div>尚未大于 5</div>
          <div>尚未大于 5</div>
          <div>尚未大于 5</div>
          <div>尚未大于 5</div>
          <div>尚未大于 5</div>
          <div>尚未大于 5</div>
          <div>尚未大于 5</div>
          <div>尚未大于 5</div>
        </p>
      )}
    </main>
  );
}
