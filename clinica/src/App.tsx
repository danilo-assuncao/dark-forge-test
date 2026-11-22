import { useState } from 'react'

const App = () => {
  const [count, setCount] = useState(0)

  return (
    <div>
      <h1>Clinica</h1>
      <button onClick={() => setCount(count + 1)}>Count is {count}</button>
    </div>
  )
}

export default App
