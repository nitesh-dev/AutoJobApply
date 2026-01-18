import Logo from '@/assets/crx.svg'
import { useState, useEffect } from 'react'
import './App.scss'
import { LogViewer } from '../components/LogViewer'
import { logStore } from '../logger/store'

function App() {
  const [show, setShow] = useState(true)
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
        <div className={`popup-content card ${show ? 'opacity-100' : 'opacity-0'}`} style={{ padding: '0.25rem' }}>
          <LogViewer maxHeight="60vh" />
        </div>
      )}
      <button className="btn toggle-button" onClick={toggle}>
        <img src={Logo} alt="CRXJS logo" className="button-icon" />
        {logCount > 0 && <span className="log-badge">{logCount}</span>}
      </button>
    </div>
  )
}

export default App
