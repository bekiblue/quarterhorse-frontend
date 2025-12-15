import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const redirectUri = `${globalThis.location.origin}/auth/callback`;

function getConfig(provider) {
  const base = {
    redirect_uri: redirectUri,
    response_type: 'code',
    post_logout_redirect_uri: `${globalThis.location.origin}/login`,
    userStore: new WebStorageStateStore({ store: globalThis.localStorage }),
    // Enable PKCE for security
    code_challenge_method: 'S256',
  };
  
  if (provider === 'microsoft') {
    return { ...base,
      authority: 'https://login.microsoftonline.com/common/v2.0',
      client_id: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
      scope: 'User.Read',
      response_mode: 'query',  // Ensure code is returned in query parameters
      // No prompt parameter - Microsoft will handle returning users automatically
      // Only show consent screen for new users who haven't authorized the app
      extraQueryParams: {},
      // Microsoft-specific settings for better UX
      loadUserInfo: true,
      automaticSilentRenew: true
    };
  }
  
  if (provider === 'google') {
    return { ...base,
      authority: 'https://accounts.google.com',
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'openid profile email',
      // Ensure PKCE is enabled for Google
      code_challenge_method: 'S256',
      // Add additional Google OAuth parameters
      extraQueryParams: {
        access_type: 'offline'
        // No prompt parameter - Google will handle returning users automatically
      }
    };
  }
  
  throw new Error('Unsupported provider');
}

class AuthService {
  currentProvider = null;

  async signIn(provider, invitationToken) {
    this.currentProvider = provider;
    const mgr = new UserManager(getConfig(provider));
    await mgr.signinRedirect({ state: { provider, 'invitation_token': invitationToken } });
  }

  async handleCallback(provider) {
    this.currentProvider = provider;
    const mgr = new UserManager(getConfig(this.currentProvider));
    const user = await mgr.signinRedirectCallback();
    return {
      provider: this.currentProvider,
      profile: user.profile,
      idToken: user.id_token,
      accessToken: user.access_token
    };
  }

  /**
   * Retrieves the PKCE code_verifier from storage after redirect.
   * This is needed if you're doing the /token exchange on your backend.
   */
  async getCodeVerifier() {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const stateKey = urlParams.get('state');
    if (!stateKey) {
      throw new Error('Missing state param in URL');
    }

    const store = new WebStorageStateStore({ store: globalThis.localStorage });
    const stateData = JSON.parse(await store.get(stateKey))

    if (!stateData?.code_verifier) {
      throw new Error('PKCE code_verifier not found in storage');
    }

    return stateData.code_verifier;
  }

  async getStateDataValue(key, strict = true) {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const stateKey = urlParams.get('state');
    if (!stateKey) {
      throw new Error('Missing state param in URL');
    }

    const store = new WebStorageStateStore({ store: globalThis.localStorage });
    const stateData = JSON.parse(await store.get(stateKey));

    const value = stateData?.data?.[key] ?? null;

    if (strict && value === null) {
      throw new Error(`PKCE ${key} not found in storage`);
    }

    return value;
  }
}

export default new AuthService();
