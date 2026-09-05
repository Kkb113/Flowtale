interface SupportSettings {
  api_base: string;
  app_id: string;
  user_id: string;
  name: string;
  email: string;
  created_at?: number;
  custom_launcher_selector: string;
}

type Intercom = ((...args: unknown[]) => void) & { q?: unknown[][] };
type SupportWindow = Window & { Intercom?: Intercom; intercomSettings?: SupportSettings };
const supportWindow = window as SupportWindow;
const SCRIPT_ID = 'fable-support-bot';

// Profile fields stay data. Never interpolate them into executable script text.
export function updateSupportWidget(name: string, email: string, createdAt: Date | string): void {
  const previousUser = supportWindow.intercomSettings?.user_id;
  if (previousUser && previousUser !== email) shutdownSupportWidget();
  const timestamp = new Date(createdAt).getTime();
  const settings: SupportSettings = {
    api_base: 'https://api-iam.intercom.io',
    app_id: 'btay1o4i',
    user_id: email,
    name,
    email,
    ...(Number.isFinite(timestamp) ? { created_at: Math.floor(timestamp / 1000) } : {}),
    custom_launcher_selector: '.support-bot-open',
  };
  supportWindow.intercomSettings = settings;

  if (!supportWindow.Intercom) {
    const queued: Intercom = (...args) => { queued.q!.push(args); };
    queued.q = [];
    supportWindow.Intercom = queued;
  }
  supportWindow.Intercom(previousUser === email ? 'update' : 'boot', settings);
  if (document.getElementById(SCRIPT_ID)) return;
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = 'https://widget.intercom.io/widget/btay1o4i';
  script.onerror = () => { script.remove(); };
  document.head.appendChild(script);
}

export function shutdownSupportWidget(): void {
  // A queued boot must not restore the previous identity if the SDK loads after logout.
  if (supportWindow.Intercom?.q) supportWindow.Intercom.q.length = 0;
  try {
    supportWindow.Intercom?.('shutdown');
  } catch {
    // Optional SDK failure cannot prevent logout or local identity cleanup.
  } finally {
    delete supportWindow.intercomSettings;
    const domains = window.location.hostname.split('.');
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (!name.startsWith('intercom-')) continue;
      document.cookie = `${name}=; Max-Age=0; path=/`;
      for (let i = 0; i < domains.length; i++) {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${domains.slice(i).join('.')}`;
      }
    }
  }
}
