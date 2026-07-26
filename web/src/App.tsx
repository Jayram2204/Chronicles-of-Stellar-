import { useState, useEffect } from 'react';
import { GameScreen } from './components/GameScreen';
import { AuthModal } from './components/AuthModal';
import { OnboardingOverlay } from './components/OnboardingOverlay';
import { authService } from './services/authService';
import type { UserSession } from './services/authService';

const ONBOARDING_KEY = 'cos_onboarding_complete';

function App() {
  const [session, setSession] = useState<UserSession>({
    isAuthenticated: false,
    user: null,
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(ONBOARDING_KEY);
  });

  useEffect(() => {
    let cancelled = false;
    const initializeSession = async () => {
      try {
        // Complete redirect and email-link flows before falling back to a
        // stored/guest session so they cannot race and overwrite each other.
        const redirectSession = await authService.completeRedirectSignIn();
        const linkSession = redirectSession || await authService.completeEmailLinkSignIn();
        if (linkSession) {
          if (!cancelled) setSession(linkSession);
          return;
        }

        const activeSession = authService.getSession();
        const nextSession = activeSession.isAuthenticated
          ? activeSession
          : await authService.loginAsGuest();
        if (!cancelled) setSession(nextSession);
      } catch (error: any) {
        if (cancelled) return;
        // The email-link or redirect flow failed. Show the specific error
        // in the modal so the user knows *why* sign-in did not complete,
        // then fall back to a guest session so the game remains playable.
        const message = error.message || 'Authentication could not be completed.';
        setAuthError(message);
        setIsAuthModalOpen(true);
        try {
          const guestSession = await authService.loginAsGuest();
          if (!cancelled) setSession(guestSession);
        } catch {
          // Guest fallback should never fail, but guard against it.
        }
      }
    };
    void initializeSession();
    return () => { cancelled = true; };
  }, []);

  const handleAuthenticated = (newSession: UserSession) => {
    setSession(newSession);
  };

  const handleLogout = () => {
    authService.logout();
    authService.loginAsGuest().then((guestSession) => {
      setSession(guestSession);
    });
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-[#081008] flex flex-col items-center justify-between p-3 lg:p-4 font-mono select-none">
      {showOnboarding && <OnboardingOverlay onComplete={handleOnboardingComplete} />}
      {/* Top Session Identity Banner */}
      <header className="w-full max-w-[1280px] mb-3 px-4 py-2 bg-[#0f260f] border border-[#2a4a1a] rounded-lg flex justify-between items-center text-xs shadow-[0_0_15px_rgba(15,38,15,0.5)]">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>GAME ACTIVE</span>
          </span>
          <span className="text-[#e0f8d0] font-bold">{session.user?.name || 'Courier'}</span>
          <span className="text-[10px] px-2 py-0.5 bg-[#0a1a0a] border border-[#3a5c1a] text-[#8bac0f] rounded uppercase">
            {session.user?.provider || 'Guest'} Mode
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setAuthError(null);
              setIsAuthModalOpen(true);
            }}
            className="text-[11px] bg-[#142e14] hover:bg-[#1a3a1a] border border-[#4a6c2a] text-[#8bac0f] font-bold px-3 py-1 rounded transition cursor-pointer"
          >
            🔑 {session.user?.provider === 'guest' ? 'CONNECT WALLET / AUTH' : 'CHANGE IDENTITY'}
          </button>

          {session.user?.provider !== 'guest' && (
            <button
              onClick={handleLogout}
              className="text-[11px] text-[#306230] hover:text-[#3a7a3a] font-bold underline cursor-pointer"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Primary Game UI (Phaser Engine Canvas + Cyberware HUD) */}
      <main className="w-full max-w-[1280px] flex justify-center">
        <GameScreen onSessionUpdate={handleAuthenticated} />
      </main>

      {/* Lightweight Auth & Wallet Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialError={authError}
        onClose={() => {
          setAuthError(null);
          setIsAuthModalOpen(false);
        }}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}

export default App;
