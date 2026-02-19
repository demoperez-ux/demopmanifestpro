/**
 * ZENITH Console Signature
 * Prints platform branding on app initialization.
 */

export function printZenithSignature() {
  const styles = [
    'color: #002D62',
    'font-family: sans-serif',
    'font-weight: bold',
    'font-size: 14px',
    'padding: 8px 16px',
    'border-left: 4px solid #002D62',
    'background: linear-gradient(90deg, rgba(0,45,98,0.06) 0%, transparent 100%)',
  ].join(';');

  const subtitleStyles = [
    'color: #64748B',
    'font-family: sans-serif',
    'font-size: 10px',
    'padding: 4px 16px 8px',
  ].join(';');

  console.log(
    '%cZENITH v2.0 | Customs Intelligence Platform | Powered by Lexis AI Architecture.',
    styles
  );
  console.log(
    '%cZENITH Platform v2.0.26 | Core Development Team | © 2026 All Rights Reserved',
    subtitleStyles
  );
}
