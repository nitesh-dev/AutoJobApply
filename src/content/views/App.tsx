import Logo from '@/assets/crx.svg'
import { useState, useEffect } from 'react'
import './App.css'
import { LogViewer } from '../components/LogViewer'
import { logger } from '../logger'

function App() {
  const [show, setShow] = useState(false)
  const toggle = () => {
    setShow(!show)
    logger.info(`Panel ${!show ? 'opened' : 'closed'}`)
  }

  useEffect(() => {
    logger.info('AutoJobApply extension initialized')
    logger.success('Ready to process job applications')
  }, [])

  return (
    <div className="popup-container">
      {show && (
        <div className={`popup-content ${show ? 'opacity-100' : 'opacity-0'}`}>
          <h1>HELLO CRXJS</h1>
          <LogViewer maxHeight="300px" />
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => logger.info('Info message example')}>Log Info</button>
            <button onClick={() => logger.success('Success message example')}>Log Success</button>
            <button onClick={() => logger.warning('Warning message example')}>Log Warning</button>
            <button onClick={() => logger.error('Error message example')}>Log Error</button>
            <button onClick={() => logger.processing('Sample processing step')}>Log Processing</button>
            <button onClick={() => logger.info('With details', { field: 'value', count: 42 })}>Log With Details</button>
          </div>
        </div>
      )}
      <button className="toggle-button" onClick={toggle}>
        <img src={Logo} alt="CRXJS logo" className="button-icon" />
      </button>
    </div>
  )
}

export default App
