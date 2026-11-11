import { LOGO } from '../lib/api'

export default function AppLoadingScreen() {
  return (
    <div className="app-loading-screen" role="status" aria-live="polite">
      <div className="app-loading-content">
        <div className="app-loading-mark">
          <span className="app-loading-orbit" />
          <img src={LOGO} alt="" className="app-loading-logo" />
        </div>
        <p className="app-loading-brand">MAJO <span>GADGETS</span></p>
        <p className="app-loading-message">Getting things ready</p>
        <div className="app-loading-progress" aria-hidden="true"><span /></div>
        <p className="app-loading-caption">A better shopping experience is just a moment away.</p>
      </div>
    </div>
  )
}
