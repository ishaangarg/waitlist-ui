'use client';

import * as React from 'react';

// Bundlers statically replace the literal `process.env.NEXT_PUBLIC_*` member
// expression, so it has to survive verbatim. Declared here rather than pulling
// @types/node into a browser package.
declare const process: { env?: Record<string, string | undefined> } | undefined;

export type WaitlistStatus = 'idle' | 'submitting' | 'success' | 'error';

/**
 * What the form collects. 'either' shows one field and classifies what was
 * typed — nothing but an email address contains '@'.
 */
export type WaitlistMode = 'phone' | 'email' | 'either';

export type WaitlistClassNames = {
  root?: string;
  form?: string;
  field?: string;
  input?: string;
  button?: string;
  message?: string;
  success?: string;
};

export type WaitlistProps = {
  /** Which waitlist this signup belongs to, e.g. "delivery-assistant". */
  project: string;
  /** Collect a phone number, an email address, or accept either. */
  mode?: WaitlistMode;
  /**
   * Collector endpoint. Falls back to NEXT_PUBLIC_WAITLIST_ENDPOINT, then to
   * the same-origin `/api/signup` for sites that host the collector themselves.
   */
  endpoint?: string;
  /** Fallback region for numbers typed without a + prefix. */
  country?: string;
  placeholder?: string;
  buttonLabel?: string;
  submittingLabel?: string;
  successMessage?: string;
  /** Extra fields stored alongside the number (UTM params are added automatically). */
  metadata?: Record<string, unknown>;
  classNames?: WaitlistClassNames;
  onSuccess?: (result: { duplicate: boolean }) => void;
  onError?: (error: string) => void;
};

const ERRORS: Record<string, string> = {
  invalid_email: 'That doesn’t look like a valid email address.',
  contact_required: 'Please enter something first.',
  invalid_phone: 'That doesn’t look like a valid phone number.',
  rate_limited: 'Too many attempts. Try again in a bit.',
  origin_not_allowed: 'This site isn’t authorised to submit. Check the collector allowlist.',
};

export function Waitlist({
  project,
  mode = 'phone',
  endpoint,
  country = 'IN',
  placeholder,
  buttonLabel = 'Join the waitlist',
  submittingLabel = 'Joining…',
  successMessage = 'You’re on the list. We’ll text you at launch.',
  metadata,
  classNames = {},
  onSuccess,
  onError,
}: WaitlistProps) {
  const [value, setValue] = React.useState('');
  const [hp, setHp] = React.useState('');
  const [status, setStatus] = React.useState<WaitlistStatus>('idle');
  const [message, setMessage] = React.useState('');
  const mountedAt = React.useRef(Date.now());

  const kind = mode;
  const field =
    kind === 'email'
      ? { type: 'email', inputMode: 'email' as const, autoComplete: 'email', name: 'email' }
      : kind === 'phone'
        ? { type: 'tel', inputMode: 'tel' as const, autoComplete: 'tel', name: 'phone' }
        : { type: 'text', inputMode: 'text' as const, autoComplete: 'on', name: 'contact' };
  const hint =
    placeholder ??
    (kind === 'email'
      ? 'Your email address'
      : kind === 'phone'
        ? 'Your phone number'
        : 'Email or phone number');

  const url =
    endpoint ??
    (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_WAITLIST_ENDPOINT : undefined) ??
    '/api/signup';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === 'submitting') return;

    // Cheap client-side check only; the server is the authority on validity.
    const looksEmail = kind === 'email' || (kind === 'either' && value.includes('@'));
    if (looksEmail ? !/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(value.trim()) : value.replace(/\D/g, '').length < 6) {
      setStatus('error');
      setMessage(looksEmail ? ERRORS.invalid_email : ERRORS.invalid_phone);
      return;
    }

    setStatus('submitting');
    setMessage('');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project,
          // Named field when we know the kind, bare `contact` when the server
          // should classify it.
          ...(kind === 'either' ? { contact: value } : { [kind]: value }),
          country,
          hp,
          elapsedMs: Date.now() - mountedAt.current,
          metadata: { ...collectContext(), ...metadata },
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        duplicate?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        const key = data.error ?? 'server_error';
        setStatus('error');
        setMessage(ERRORS[key] ?? 'Something went wrong. Please try again.');
        onError?.(key);
        return;
      }

      setStatus('success');
      setMessage(successMessage);
      setValue('');
      onSuccess?.({ duplicate: Boolean(data.duplicate) });
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
      onError?.('network_error');
    }
  }

  if (status === 'success') {
    return (
      <div
        className={classNames.success ?? classNames.root}
        data-waitlist="success"
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    );
  }

  return (
    <div className={classNames.root} data-waitlist="root">
      <form className={classNames.form} onSubmit={handleSubmit} data-waitlist="form" noValidate>
        <div className={classNames.field} data-waitlist="field">
          <input
            type={field.type}
            name={field.name}
            inputMode={field.inputMode}
            autoComplete={field.autoComplete}
            className={classNames.input}
            data-waitlist="input"
            placeholder={hint}
            aria-label={hint}
            aria-invalid={status === 'error'}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            required
          />
          <button
            type="submit"
            className={classNames.button}
            data-waitlist="button"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? submittingLabel : buttonLabel}
          </button>
        </div>

        {/* Honeypot: hidden from users, irresistible to bots. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        />
      </form>

      {status === 'error' && message ? (
        <p className={classNames.message} data-waitlist="error" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function collectContext(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const context: Record<string, string> = { path: window.location.pathname };

  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref']) {
    const value = params.get(key);
    if (value) context[key] = value;
  }
  if (document.referrer) context.referrer = document.referrer;
  return context;
}
