import React from 'react'; import { createRoot } from 'react-dom/client'; import App from './App.jsx'; import './styles.css';
class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state={ err:null }; }
  static getDerivedStateFromError(err){ return { err }; }
  componentDidCatch(err, info){ console.error('App crashed:', err, info); }
  render(){ if(!this.state.err) return this.props.children;
    return <div style={{maxWidth:560,margin:'60px auto',padding:24,background:'#fff',borderRadius:14,fontFamily:'system-ui',boxShadow:'0 2px 10px rgba(0,0,0,.1)'}}>
      <h2>Something went wrong 😕</h2><p>The prototype hit an error. Try resetting the demo data.</p>
      <pre style={{whiteSpace:'pre-wrap',background:'#f1f5f9',padding:12,borderRadius:8,fontSize:12}}>{String(this.state.err && (this.state.err.stack || this.state.err))}</pre>
      <button style={{padding:'10px 16px',borderRadius:10,background:'#16a34a',color:'#fff',border:0}} onClick={()=>{ localStorage.clear(); location.hash='#/'; location.reload(); }}>Reset demo & reload</button></div>; }
}
createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);
