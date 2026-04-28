import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'
import { Auth0Provider } from '@auth0/auth0-react'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    < Auth0Provider
      domain="dev-ukyrrcj3ae3vbym2.us.auth0.com"
      clientId="7bkrdFdYH67Ed3NT1ZmSWnuKjvHrTKVY"
      authorizationParams={{ redirect_uri: window.location.origin,
        audience: "https://dev-ukyrrcj3ae3vbym2.us.auth0.com/api/v2/"
      }}
    >
    <App />
    </Auth0Provider>
  </StrictMode>
)
