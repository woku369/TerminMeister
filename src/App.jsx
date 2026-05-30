import { useState } from 'react'
import TerminplanungsModul from './components/TerminplanungsModul'
import ErrorBoundary from './components/common/ErrorBoundary'
import StiftGurkThemeProvider from './components/theme/StiftGurkThemeProvider'
import './App.css'

function App() {
  return (
    <StiftGurkThemeProvider>
      <div className="App">
        <ErrorBoundary>
          <TerminplanungsModul />
        </ErrorBoundary>
      </div>
    </StiftGurkThemeProvider>
  )
}

export default App
