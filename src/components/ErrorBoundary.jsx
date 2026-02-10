import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0a0a0a',
                    color: '#fff',
                    textAlign: 'center',
                    padding: '20px'
                }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ff4d4f' }}>Something went wrong.</h1>
                    <p style={{ marginBottom: '2rem', color: '#aaa', maxWidth: '600px' }}>
                        A unexpected error has occurred. We apologize for the inconvenience.
                    </p>
                    <div style={{
                        backgroundColor: '#1f1f1f',
                        padding: '15px',
                        borderRadius: '8px',
                        textAlign: 'left',
                        maxWidth: '800px',
                        width: '100%',
                        marginBottom: '2rem',
                        overflow: 'auto',
                        maxHeight: '200px',
                        border: '1px solid #333'
                    }}>
                        <code style={{ color: '#ff7875', display: 'block', marginBottom: '10px' }}>
                            {this.state.error && this.state.error.toString()}
                        </code>
                        <pre style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={this.handleReload}
                        style={{
                            padding: '10px 20px',
                            fontSize: '1rem',
                            backgroundColor: '#1890ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'background 0.3s'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#40a9ff'}
                        onMouseOut={(e) => e.target.style.background = '#1890ff'}
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
