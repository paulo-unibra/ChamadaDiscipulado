import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="login-page"><section className="panel" role="alert"><h1>Não foi possível exibir esta tela.</h1><p>Recarregue a aplicação para tentar novamente.</p><button className="button primary" onClick={() => window.location.reload()}>Recarregar</button></section></main>;
    return this.props.children;
  }
}
