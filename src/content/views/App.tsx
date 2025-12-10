import Logo from '@/assets/crx.svg'
import { useState, useEffect } from 'react'
import './App.css'
import { LogViewer } from '../components/LogViewer'
import { logStore } from '../logger/store'

function App() {
  const [show, setShow] = useState(false)
  const [logCount, setLogCount] = useState(0)
  const toggle = () => {
    setShow(!show)
  }

  useEffect(() => {
    const unsubscribe = logStore.subscribe((logs) => {
      setLogCount(logs.length)
    })
    return unsubscribe
  }, [])

  return (
    <div className="popup-container">
      {show && (
        <div className={`popup-content ${show ? 'opacity-100' : 'opacity-0'}`}>
          <LogViewer maxHeight="300px" />
          {/* <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => logger.error('Error message example')}>Log Error</button>
          </div> */}
        </div>
      )}
      <button className="toggle-button" onClick={toggle}>
        <img src={Logo} alt="CRXJS logo" className="button-icon" />
        {logCount > 0 && <span className="log-badge">{logCount}</span>}
      </button>
    </div>
  )
}

export default App
